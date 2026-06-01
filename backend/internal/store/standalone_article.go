package store

import (
	"database/sql"
	"errors"
	"fmt"

	"github.com/0x2E/fusion/internal/model"
)

func (s *Store) CreateStandaloneArticle(link, title, content string, pubDate int64) (*model.StandaloneArticle, error) {
	result, err := s.db.Exec(`
		INSERT INTO standalone_articles (link, title, content, pub_date)
		VALUES (:link, :title, :content, :pub_date)
	`, sql.Named("link", link), sql.Named("title", title),
		sql.Named("content", content), sql.Named("pub_date", pubDate))
	if err != nil {
		return nil, err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return nil, err
	}

	return s.GetStandaloneArticle(id)
}

func (s *Store) ListStandaloneArticles(limit, offset int) ([]*model.StandaloneArticle, error) {
	query := `
		SELECT id, link, title, content, pub_date, created_at
		FROM standalone_articles
		ORDER BY created_at DESC, id DESC
	`
	args := []any{}

	if limit > 0 {
		query += ` LIMIT :limit`
		args = append(args, sql.Named("limit", limit))
	}
	if offset > 0 {
		query += ` OFFSET :offset`
		args = append(args, sql.Named("offset", offset))
	}

	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	articles := []*model.StandaloneArticle{}
	for rows.Next() {
		a := &model.StandaloneArticle{}
		if err := rows.Scan(&a.ID, &a.Link, &a.Title, &a.Content, &a.PubDate, &a.CreatedAt); err != nil {
			return nil, err
		}
		articles = append(articles, a)
	}
	return articles, rows.Err()
}

func (s *Store) GetStandaloneArticle(id int64) (*model.StandaloneArticle, error) {
	a := &model.StandaloneArticle{}
	err := s.db.QueryRow(`
		SELECT id, link, title, content, pub_date, created_at
		FROM standalone_articles
		WHERE id = :id
	`, sql.Named("id", id)).Scan(&a.ID, &a.Link, &a.Title, &a.Content, &a.PubDate, &a.CreatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("%w: standalone article", ErrNotFound)
		}
		return nil, fmt.Errorf("get standalone article: %w", err)
	}
	return a, nil
}

func (s *Store) DeleteStandaloneArticle(id int64) error {
	result, err := s.db.Exec(`DELETE FROM standalone_articles WHERE id = :id`, sql.Named("id", id))
	if err != nil {
		return err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return fmt.Errorf("%w: standalone article", ErrNotFound)
	}
	return nil
}

func (s *Store) CountStandaloneArticles() (int, error) {
	var count int
	err := s.db.QueryRow(`SELECT COUNT(*) FROM standalone_articles`).Scan(&count)
	return count, err
}

func (s *Store) StandaloneArticleExists(link string) (bool, error) {
	var exists bool
	err := s.db.QueryRow(`SELECT EXISTS(SELECT 1 FROM standalone_articles WHERE link = :link)`, sql.Named("link", link)).Scan(&exists)
	return exists, err
}

func (s *Store) GetStandaloneArticleByLink(link string) (*model.StandaloneArticle, error) {
	a := &model.StandaloneArticle{}
	err := s.db.QueryRow(`
		SELECT id, link, title, content, pub_date, created_at
		FROM standalone_articles
		WHERE link = :link
	`, sql.Named("link", link)).Scan(&a.ID, &a.Link, &a.Title, &a.Content, &a.PubDate, &a.CreatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("%w: standalone article", ErrNotFound)
		}
		return nil, fmt.Errorf("get standalone article by link: %w", err)
	}
	return a, nil
}
