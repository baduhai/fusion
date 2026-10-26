package pull

import (
	"regexp"
	"strings"
	"time"
)

// Brazilian Portuguese date tokens. gofeed only understands English month and
// weekday names, so localized RSS dates such as UOL's
// "Seg, 26 Out 2026 07:16:04 -0300" would otherwise fall back to the fetch
// time, collapsing every item onto the same pub_date.
var ptBRDateTokens = map[string]string{
	"dom": "Sun", "seg": "Mon", "ter": "Tue", "qua": "Wed", "qui": "Thu", "sex": "Fri", "sab": "Sat", "sáb": "Sat",
	"jan": "Jan", "fev": "Feb", "mar": "Mar", "abr": "Apr", "mai": "May", "jun": "Jun",
	"jul": "Jul", "ago": "Aug", "set": "Sep", "out": "Oct", "nov": "Nov", "dez": "Dec",
}

var dateWordRe = regexp.MustCompile(`\p{L}+`)

var localizedDateLayouts = []string{
	"Mon, 2 Jan 2006 15:04:05 -0700",
	"Mon, 02 Jan 2006 15:04:05 -0700",
	"Mon, 2 Jan 2006 15:04 -0700",
	"2 Jan 2006 15:04:05 -0700",
	"2 Jan 2006 15:04 -0700",
}

// parseLocalizedDate parses feed dates whose month or weekday names are in
// Brazilian Portuguese.
func parseLocalizedDate(raw string) (time.Time, bool) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return time.Time{}, false
	}

	normalized := dateWordRe.ReplaceAllStringFunc(raw, func(word string) string {
		if english, ok := ptBRDateTokens[strings.ToLower(word)]; ok {
			return english
		}
		return word
	})

	for _, layout := range localizedDateLayouts {
		if parsed, err := time.Parse(layout, normalized); err == nil {
			return parsed, true
		}
	}

	return time.Time{}, false
}
