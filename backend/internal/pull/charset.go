package pull

import (
	"bufio"
	"bytes"
	"io"
	"mime"
	"net/http"
	"regexp"
	"strings"

	"golang.org/x/net/html/charset"
)

const charsetSniffLen = 512

var (
	xmlEncodingDeclRe = regexp.MustCompile(`(?i)^<\?xml[^>]*?encoding\s*=\s*["']([^"']+)["']`)
	xmlEncodingAttrRe = regexp.MustCompile(`(?i)^(<\?xml[^>]*?encoding\s*=\s*["'])[^"']*(["'])`)
)

// decodeFeedBody converts the response body to UTF-8. encoding/xml only
// decodes declared XML encodings; feeds that declare a non-UTF-8 charset
// solely in the Content-Type header (like UOL's ISO-8859-1) would otherwise
// fail with "invalid UTF-8". The detected source order is BOM, XML
// declaration, Content-Type header, then UTF-8.
func decodeFeedBody(resp *http.Response) (io.Reader, error) {
	br := bufio.NewReader(resp.Body)
	head, _ := br.Peek(charsetSniffLen)

	label := detectCharset(head, resp.Header.Get("Content-Type"))
	if isUTF8Label(label) {
		if bytes.HasPrefix(head, []byte{0xEF, 0xBB, 0xBF}) {
			_, _ = br.Discard(3)
		}
		return br, nil
	}

	// Unknown labels keep the previous assume-UTF-8 behavior instead of
	// rejecting a feed that may still parse fine.
	if enc, _ := charset.Lookup(label); enc == nil {
		return br, nil
	}

	data, err := io.ReadAll(br)
	if err != nil {
		return nil, err
	}

	decoded, err := charset.NewReaderLabel(label, bytes.NewReader(data))
	if err != nil {
		return nil, err
	}

	utf8Data, err := io.ReadAll(decoded)
	if err != nil {
		return nil, err
	}

	// UTF-16 decoders keep the BOM as U+FEFF, which breaks feed type detection.
	utf8Data = bytes.TrimPrefix(utf8Data, []byte{0xEF, 0xBB, 0xBF})

	return bytes.NewReader(normalizeXMLDeclaration(utf8Data)), nil
}

func detectCharset(head []byte, contentType string) string {
	switch {
	case bytes.HasPrefix(head, []byte{0xEF, 0xBB, 0xBF}):
		return "utf-8"
	case bytes.HasPrefix(head, []byte{0xFF, 0xFE}):
		return "utf-16le"
	case bytes.HasPrefix(head, []byte{0xFE, 0xFF}):
		return "utf-16be"
	}

	if match := xmlEncodingDeclRe.FindSubmatch(head); match != nil {
		return string(match[1])
	}

	if _, params, err := mime.ParseMediaType(contentType); err == nil {
		if label := strings.TrimSpace(params["charset"]); label != "" {
			return label
		}
	}

	return "utf-8"
}

func isUTF8Label(label string) bool {
	switch strings.ToLower(strings.TrimSpace(label)) {
	case "", "utf-8", "utf8", "us-ascii", "ascii":
		return true
	}
	return false
}

// normalizeXMLDeclaration rewrites a declared non-UTF-8 encoding to UTF-8 so
// the XML decoder does not try to re-decode already converted bytes.
func normalizeXMLDeclaration(data []byte) []byte {
	return xmlEncodingAttrRe.ReplaceAll(data, []byte("${1}UTF-8${2}"))
}
