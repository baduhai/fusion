package pull

import (
	"testing"
	"time"

	"github.com/mmcdole/gofeed"
)

func TestMapItemParsesBrazilianPortuguesePublishedDate(t *testing.T) {
	item := &gofeed.Item{
		Title:     "Example",
		Published: "Seg, 26 Out 2026 07:16:04 -0300",
	}

	parsed := mapItem(item, nil)

	want := time.Date(2026, time.October, 26, 7, 16, 4, 0, time.FixedZone("", -3*60*60)).Unix()
	if parsed.PubDate != want {
		t.Fatalf("expected pub_date %d, got %d", want, parsed.PubDate)
	}
}

func TestMapItemParsesBrazilianPortugueseUpdatedDate(t *testing.T) {
	item := &gofeed.Item{
		Title:   "Example",
		Updated: "Sáb, 1 Fev 2026 00:00:00 -0300",
	}

	parsed := mapItem(item, nil)

	want := time.Date(2026, time.February, 1, 0, 0, 0, 0, time.FixedZone("", -3*60*60)).Unix()
	if parsed.PubDate != want {
		t.Fatalf("expected pub_date %d, got %d", want, parsed.PubDate)
	}
}
