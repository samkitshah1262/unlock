// Math Card Component - iOS Glassmorphism Style

import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
} from 'react-native'
import RenderHtml from 'react-native-render-html'
import MathText from './MathText'
import type { MathCard as MathCardType } from '../types/math'
import { subjectInfo, cardTypeInfo, getDifficultyInfo, mlRelevanceInfo } from '../types/math'

interface Props {
  card: MathCardType
}

export default function MathCard({ card }: Props) {
  const { width } = useWindowDimensions()
  const subject = subjectInfo[card.subject] || { name: card.subject, color: '#6366F1', icon: '📚' }
  const cardType = cardTypeInfo[card.type] || { name: card.type, color: '#3B82F6', icon: '📄' }
  const difficulty = getDifficultyInfo(card.difficulty)
  const mlRel = mlRelevanceInfo[card.mlRelevance] || { label: card.mlRelevance, color: '#6B7280' }

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
    code: {
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
      color: '#22D3EE',
      fontFamily: 'Courier',
      paddingHorizontal: 4,
      borderRadius: 4,
    },
  }

  const baseStyles = {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 15,
  }

  return (
    <View style={styles.card}>
      {/* Glass overlay effect */}
      <View style={styles.glassOverlay} />
      
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with type and subject badges */}
        <View style={styles.header}>
          <View style={[styles.typeBadge, { backgroundColor: cardType.color + '25' }]}>
            <Text style={styles.typeBadgeIcon}>{cardType.icon}</Text>
            <Text style={[styles.typeBadgeText, { color: cardType.color }]}>
              {cardType.name}
            </Text>
          </View>
          <View style={[styles.subjectBadge, { backgroundColor: subject.color + '25' }]}>
            <Text style={styles.subjectBadgeIcon}>{subject.icon}</Text>
            <Text style={[styles.subjectBadgeText, { color: subject.color }]}>
              {subject.name}
            </Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>{card.title}</Text>
        
        {/* Subtitle if present */}
        {card.subtitle && (
          <Text style={styles.subtitle}>{card.subtitle}</Text>
        )}

        {/* Meta info row */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <View style={[styles.difficultyDot, { backgroundColor: difficulty.color }]} />
            <Text style={[styles.metaText, { color: difficulty.color }]}>
              {difficulty.label}
            </Text>
          </View>
          <Text style={styles.metaDot}>•</Text>
          <Text style={[styles.metaText, { color: mlRel.color }]}>
            {mlRel.label}
          </Text>
          <Text style={styles.metaDot}>•</Text>
          <Text style={styles.metaTextLight}>
            {card.estimatedMinutes} min
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

        {/* Formula (if present) */}
        {card.formula && card.formula.latex && (
          <View style={styles.formulaSection}>
            {card.formula.name && (
              <Text style={styles.formulaName}>{card.formula.name}</Text>
            )}
            <View style={styles.formulaBox}>
              <MathText latex={card.formula.latex} color="#A5B4FC" fontSize={20} />
            </View>
            {card.formula.variants && card.formula.variants.length > 0 && (
              <View style={styles.variants}>
                {card.formula.variants.filter(v => v && v.latex).map((variant, index) => (
                  <View key={index} style={styles.variantItem}>
                    <MathText latex={variant.latex} color="rgba(165, 180, 252, 0.9)" fontSize={16} />
                    {variant.description && (
                      <Text style={styles.variantDesc}>{variant.description}</Text>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Main content */}
        {card.contentHtml && (
          <RenderHtml
            contentWidth={width - 80}
            source={{ html: card.contentHtml }}
            tagsStyles={htmlTagStyles}
            baseStyle={baseStyles}
            ignoredDomTags={['center', 'script', 'style', 'math']}
          />
        )}

        {/* Worked Example (if present) */}
        {card.workedExample && card.workedExample.problemHtml && (
          <View style={styles.workedExampleSection}>
            <Text style={styles.sectionTitle}>📝 Worked Example</Text>
            
            <Text style={styles.problemLabel}>Problem</Text>
            <RenderHtml
              contentWidth={width - 80}
              source={{ html: card.workedExample.problemHtml }}
              tagsStyles={htmlTagStyles}
              baseStyle={baseStyles}
              ignoredDomTags={['center', 'script', 'style', 'math']}
            />
            
            {card.workedExample.steps && card.workedExample.steps.map((step, index) => (
              <View key={index} style={styles.stepContainer}>
                <View style={styles.stepHeader}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{step.stepNumber}</Text>
                  </View>
                  <Text style={styles.stepDescription}>{step.description}</Text>
                </View>
                {step.mathHtml && (
                  <View style={styles.stepMath}>
                    <RenderHtml
                      contentWidth={width - 100}
                      source={{ html: step.mathHtml }}
                      tagsStyles={htmlTagStyles}
                      baseStyle={baseStyles}
                      ignoredDomTags={['center', 'script', 'style', 'math']}
                    />
                  </View>
                )}
                {step.explanation && (
                  <Text style={styles.stepExplanation}>{step.explanation}</Text>
                )}
              </View>
            ))}
            
            <View style={styles.finalAnswer}>
              <Text style={styles.finalAnswerLabel}>Final Answer</Text>
              <Text style={styles.finalAnswerText}>{card.workedExample.finalAnswer}</Text>
            </View>
          </View>
        )}

        {/* Intuition (if present) */}
        {card.intuition && (
          <View style={styles.intuitionSection}>
            <Text style={styles.sectionTitle}>💡 Intuition</Text>
            <Text style={styles.intuitionText}>{card.intuition}</Text>
          </View>
        )}

        {/* Common Mistakes (if present) */}
        {card.commonMistakes && card.commonMistakes.length > 0 && (
          <View style={styles.mistakesSection}>
            <Text style={styles.sectionTitle}>⚠️ Common Mistakes</Text>
            {card.commonMistakes.map((mistake, index) => (
              <View key={index} style={styles.mistakeItem}>
                <Text style={styles.mistakeBullet}>•</Text>
                <Text style={styles.mistakeText}>{mistake}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Real World Applications (if present) */}
        {card.realWorldApplications && card.realWorldApplications.length > 0 && (
          <View style={styles.applicationsSection}>
            <Text style={styles.sectionTitle}>🌍 Applications</Text>
            {card.realWorldApplications.map((app, index) => (
              <View key={index} style={styles.appItem}>
                <Text style={styles.appBullet}>→</Text>
                <Text style={styles.appText}>{app}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Bottom padding */}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Decorative accent */}
      <View style={[styles.topAccent, { backgroundColor: subject.color }]} />
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
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  typeBadgeIcon: {
    fontSize: 12,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  subjectBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  subjectBadgeIcon: {
    fontSize: 12,
  },
  subjectBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
    letterSpacing: -0.3,
    lineHeight: 28,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 12,
    fontStyle: 'italic',
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
  formulaSection: {
    marginBottom: 20,
  },
  formulaName: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 8,
  },
  formulaBox: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    alignItems: 'center',
  },
  variants: {
    marginTop: 12,
  },
  variantItem: {
    marginTop: 8,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(99, 102, 241, 0.3)',
  },
  variantDesc: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    marginTop: 8,
  },
  workedExampleSection: {
    marginTop: 16,
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  problemLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  stepContainer: {
    marginTop: 16,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C4B5FD',
  },
  stepDescription: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 20,
  },
  stepMath: {
    marginLeft: 34,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  stepExplanation: {
    marginLeft: 34,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  finalAnswer: {
    marginTop: 16,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  finalAnswerLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4ADE80',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  finalAnswerText: {
    fontSize: 15,
    color: '#86EFAC',
    fontWeight: '500',
    lineHeight: 22,
  },
  intuitionSection: {
    marginTop: 16,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  intuitionText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  mistakesSection: {
    marginTop: 16,
  },
  mistakeItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  mistakeBullet: {
    color: '#F87171',
    fontSize: 14,
    marginRight: 8,
    marginTop: 2,
  },
  mistakeText: {
    flex: 1,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
  },
  applicationsSection: {
    marginTop: 16,
  },
  appItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  appBullet: {
    color: '#34D399',
    fontSize: 14,
    marginRight: 8,
    marginTop: 1,
  },
  appText: {
    flex: 1,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
  },
})
