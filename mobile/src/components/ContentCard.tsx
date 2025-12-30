// Content Card Component - Displays different card types

import React from 'react'
import { View, Text, ScrollView, StyleSheet, Dimensions } from 'react-native'
import Markdown from 'react-native-markdown-display'
import type { ContentCard as ContentCardType } from '../types/content'

const { width, height } = Dimensions.get('window')

interface Props {
  card: ContentCardType
}

export default function ContentCard({ card }: Props) {
  const getTypeIcon = () => {
    switch (card.type) {
      case 'problem': return '🎯'
      case 'tech_article': return '💻'
      case 'finance_article': return '💰'
      case 'book_summary': return '📚'
      default: return '📄'
    }
  }

  const getTypeLabel = () => {
    switch (card.type) {
      case 'problem': return 'CODING PROBLEM'
      case 'tech_article': return 'TECH'
      case 'finance_article': return 'FINANCE'
      case 'book_summary': return 'BOOK SUMMARY'
      default: return 'CONTENT'
    }
  }

  return (
    <View style={styles.card}>
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Type Badge */}
        <View style={styles.typeBadge}>
          <Text style={styles.typeIcon}>{getTypeIcon()}</Text>
          <Text style={styles.typeLabel}>{getTypeLabel()}</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>{card.title}</Text>

        {/* Meta */}
        <View style={styles.meta}>
          <Text style={styles.metaText}>
            {card.source_name} • {card.read_time_minutes} min read
          </Text>
        </View>

        {/* Summary */}
        <Text style={styles.summary}>{card.summary}</Text>

        {/* Key Points */}
        {card.key_points && card.key_points.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Key Points:</Text>
            {card.key_points.map((point, index) => (
              <Text key={index} style={styles.bullet}>
                • {point}
              </Text>
            ))}
          </View>
        )}

        {/* Body */}
        <Markdown style={markdownStyles}>{card.body}</Markdown>

        {/* Tags */}
        {card.tags && card.tags.length > 0 && (
          <View style={styles.tags}>
            {card.tags.map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Swipe for next →
          </Text>
        </View>
      </ScrollView>
    </View>
  )
}

const markdownStyles = {
  body: {
    fontSize: 16,
    lineHeight: 26,
    color: '#374151',
  },
  heading1: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 12,
  },
  heading2: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 14,
    marginBottom: 10,
  },
  heading3: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 12,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 26,
    color: '#374151',
    marginBottom: 12,
  },
  strong: {
    fontWeight: '700',
    color: '#1F2937',
  },
  em: {
    fontStyle: 'italic',
    color: '#4B5563',
  },
  code_inline: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 14,
    fontFamily: 'monospace',
    color: '#DC2626',
  },
  code_block: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
    fontSize: 14,
    fontFamily: 'monospace',
  },
  bullet_list: {
    marginBottom: 12,
  },
  ordered_list: {
    marginBottom: 12,
  },
  list_item: {
    fontSize: 16,
    lineHeight: 24,
    color: '#374151',
    marginBottom: 6,
  },
  blockquote: {
    backgroundColor: '#F9FAFB',
    borderLeftWidth: 4,
    borderLeftColor: '#4F46E5',
    paddingLeft: 16,
    paddingVertical: 8,
    marginVertical: 12,
  },
  link: {
    color: '#4F46E5',
    textDecorationLine: 'underline',
  },
}

const styles = StyleSheet.create({
  card: {
    width: width - 40,
    height: height - 200,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  scrollView: {
    flex: 1,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  typeIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  typeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
    lineHeight: 32,
  },
  meta: {
    marginBottom: 16,
  },
  metaText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  summary: {
    fontSize: 16,
    lineHeight: 24,
    color: '#374151',
    marginBottom: 20,
    fontWeight: '500',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  bullet: {
    fontSize: 15,
    lineHeight: 24,
    color: '#4B5563',
    marginBottom: 8,
    paddingLeft: 8,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  tag: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4F46E5',
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
})
