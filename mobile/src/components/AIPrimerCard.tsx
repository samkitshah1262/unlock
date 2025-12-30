// AI Primer Card Component - For aman.ai scraped content

import React, { useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  Image,
} from 'react-native'
import RenderHtml, { defaultSystemFonts } from 'react-native-render-html'
import type { AIPrimerCard as AIPrimerCardType } from '../types/ai-primers'
import { getCategoryInfo, getDifficultyInfo } from '../types/ai-primers'

// Custom renderer to handle broken image URLs from scraped content
const renderersProps = {
  img: {
    enableExperimentalPercentWidth: true,
  },
}

// Filter out invalid image sources
const domVisitors = {
  onElement: (element: any) => {
    if (element.tagName === 'img') {
      const src = element.attribs?.src || ''
      // Filter out invalid URLs (about://, relative paths without http)
      if (src.startsWith('about:') || 
          src.startsWith('/') || 
          (!src.startsWith('http://') && !src.startsWith('https://') && !src.startsWith('data:'))) {
        // Replace with a placeholder or remove
        element.attribs.src = '' // This will cause the image to not render
        element.attribs.style = 'display:none'
      }
    }
  },
}

interface Props {
  card: AIPrimerCardType
  onRelatedPress?: (cardId: string) => void
}

export default function AIPrimerCard({ card, onRelatedPress }: Props) {
  const { width } = useWindowDimensions()
  const categoryInfo = getCategoryInfo(card.category)
  const difficultyInfo = getDifficultyInfo(card.difficulty)

  const htmlTagStyles = {
    p: {
      color: 'rgba(255, 255, 255, 0.9)',
      fontSize: 15,
      lineHeight: 24,
      marginBottom: 12,
    },
    ul: {
      color: 'rgba(255, 255, 255, 0.9)',
      marginLeft: 8,
    },
    ol: {
      color: 'rgba(255, 255, 255, 0.9)',
      marginLeft: 8,
    },
    li: {
      color: 'rgba(255, 255, 255, 0.9)',
      fontSize: 15,
      lineHeight: 24,
      marginBottom: 6,
    },
    em: {
      color: 'rgba(255, 255, 255, 0.85)',
      fontStyle: 'italic' as const,
    },
    strong: {
      color: '#FFFFFF',
      fontWeight: '600' as const,
    },
    h4: {
      color: '#FFFFFF',
      fontSize: 17,
      fontWeight: '600' as const,
      marginTop: 16,
      marginBottom: 8,
    },
    h5: {
      color: 'rgba(255, 255, 255, 0.9)',
      fontSize: 15,
      fontWeight: '600' as const,
      marginTop: 12,
      marginBottom: 6,
    },
    code: {
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
      color: '#22D3EE',
      fontFamily: 'Courier',
      paddingHorizontal: 4,
      borderRadius: 4,
      fontSize: 13,
    },
    pre: {
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      padding: 12,
      borderRadius: 8,
      overflow: 'hidden' as const,
      marginVertical: 12,
    },
    blockquote: {
      borderLeftWidth: 3,
      borderLeftColor: categoryInfo.color,
      paddingLeft: 12,
      marginLeft: 0,
      fontStyle: 'italic' as const,
      color: 'rgba(255, 255, 255, 0.7)',
    },
    table: {
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.2)',
      marginVertical: 12,
    },
    th: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      padding: 8,
      color: '#FFFFFF',
      fontWeight: '600' as const,
    },
    td: {
      padding: 8,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.1)',
      color: 'rgba(255, 255, 255, 0.9)',
    },
  }

  const baseStyles = {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 15,
  }

  return (
    <View style={styles.card}>
      {/* Glass overlay */}
      <View style={styles.glassOverlay} />
      
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header badges */}
        <View style={styles.header}>
          <View style={[styles.categoryBadge, { backgroundColor: categoryInfo.color + '25' }]}>
            <Text style={styles.categoryIcon}>{categoryInfo.icon}</Text>
            <Text style={[styles.categoryText, { color: categoryInfo.color }]}>
              {categoryInfo.name}
            </Text>
          </View>
          {card.metadata.hasCode && (
            <View style={styles.featureBadge}>
              <Text style={styles.featureIcon}>💻</Text>
            </View>
          )}
          {card.metadata.hasMath && (
            <View style={styles.featureBadge}>
              <Text style={styles.featureIcon}>∑</Text>
            </View>
          )}
        </View>

        {/* Breadcrumb */}
        <Text style={styles.breadcrumb}>
          {card.article} {card.chapter !== card.article ? `› ${card.chapter}` : ''}
        </Text>

        {/* Title */}
        <Text style={styles.title}>{card.title}</Text>

        {/* Meta row */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <View style={[styles.difficultyDot, { backgroundColor: difficultyInfo.color }]} />
            <Text style={[styles.metaText, { color: difficultyInfo.color }]}>
              {difficultyInfo.label}
            </Text>
          </View>
          <Text style={styles.metaDot}>•</Text>
          <Text style={styles.metaTextLight}>
            {card.estimatedMinutes} min read
          </Text>
          <Text style={styles.metaDot}>•</Text>
          <Text style={styles.metaTextLight}>
            {card.metadata.wordCount} words
          </Text>
        </View>

        {/* Tags */}
        {card.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {card.tags.slice(0, 5).map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Divider */}
        <View style={styles.divider} />

        {/* Content */}
        {card.contentHtml && (
          <RenderHtml
            contentWidth={width - 80}
            source={{ html: card.contentHtml }}
            tagsStyles={htmlTagStyles}
            baseStyle={baseStyles}
            ignoredDomTags={['script', 'style', 'math', 'nobr', 'svg', 'button', 'input', 'form', 'img']}
            renderersProps={renderersProps}
          />
        )}

        {/* Related cards */}
        {card.relatedCards && card.relatedCards.length > 0 && onRelatedPress && (
          <View style={styles.relatedSection}>
            <Text style={styles.relatedTitle}>🔗 Related Topics</Text>
            <View style={styles.relatedRow}>
              {card.relatedCards.slice(0, 3).map((relatedId, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.relatedChip}
                  onPress={() => onRelatedPress(relatedId)}
                >
                  <Text style={styles.relatedChipText}>
                    {relatedId.split('-').slice(2, 4).join(' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Navigation hints */}
        <View style={styles.navHints}>
          <Text style={styles.navHintText}>
            ← Parallel  •  Deeper →
          </Text>
        </View>

        {/* Bottom padding */}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Top accent */}
      <View style={[styles.topAccent, { backgroundColor: categoryInfo.color }]} />
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    position: 'relative',
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  topAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    opacity: 0.8,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingTop: 24,
  },
  header: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  categoryIcon: {
    fontSize: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  featureBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  featureIcon: {
    fontSize: 12,
  },
  breadcrumb: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 10,
    letterSpacing: -0.3,
    lineHeight: 28,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  difficultyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  metaText: {
    fontSize: 13,
    fontWeight: '500',
  },
  metaTextLight: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  metaDot: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 8,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  tag: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 16,
  },
  relatedSection: {
    marginTop: 24,
    padding: 16,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  relatedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#A5B4FC',
    marginBottom: 12,
  },
  relatedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  relatedChip: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  relatedChipText: {
    fontSize: 13,
    color: '#C4B5FD',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  navHints: {
    marginTop: 24,
    alignItems: 'center',
  },
  navHintText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.3)',
    fontWeight: '500',
  },
})

