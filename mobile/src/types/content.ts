// Content Card Types

export interface ContentCard {
  id: string
  type: 'problem' | 'tech_article' | 'finance_article' | 'book_summary'
  title: string
  summary: string
  body: string
  key_points: string[]
  image_url?: string
  image_alt?: string
  source_name: string
  source_url: string
  author?: string
  published_at?: string
  tags: string[]
  read_time_minutes: number
  created_at: string
}
