// Codeforces Problem Card - iOS Glassmorphism Style with Full Content

import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  TouchableOpacity,
} from 'react-native'
import RenderHtml from 'react-native-render-html'
import type { ProblemCard as ProblemCardType } from '../types/codeforces'
import { getDifficultyColor, getDifficultyLabel } from '../types/codeforces'

interface Props {
  problem: ProblemCardType
}

export default function ProblemCard({ problem }: Props) {
  const { width } = useWindowDimensions()
  const [showSolution, setShowSolution] = useState(false)
  const difficultyColor = getDifficultyColor(problem.rating)
  const difficultyLabel = getDifficultyLabel(problem.rating)
  const hasTutorial = !!problem.tutorialHtml

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
    li: {
      color: 'rgba(255, 255, 255, 0.9)',
      fontSize: 15,
      lineHeight: 24,
      marginBottom: 6,
    },
    b: {
      color: '#FFFFFF',
      fontWeight: '600' as const,
    },
    strong: {
      color: '#FFFFFF',
      fontWeight: '600' as const,
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
        {/* Header with index badge */}
        <View style={styles.header}>
          <View style={[styles.indexBadge, { backgroundColor: difficultyColor + '30' }]}>
            <Text style={[styles.indexText, { color: difficultyColor }]}>
              {problem.index}
            </Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.contestName} numberOfLines={1}>
              {problem.contestName}
            </Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>⏱ {problem.timeLimit}</Text>
              <Text style={styles.metaDot}>•</Text>
              <Text style={styles.metaText}>💾 {problem.memoryLimit}</Text>
            </View>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>{problem.title}</Text>

        {/* Difficulty indicator */}
        <View style={styles.difficultyRow}>
          <View style={[styles.difficultyDot, { backgroundColor: difficultyColor }]} />
          <Text style={[styles.difficultyText, { color: difficultyColor }]}>
            {problem.rating ? `${problem.rating}` : 'Unrated'} • {difficultyLabel}
          </Text>
        </View>

        {/* Tags */}
        <View style={styles.tagsRow}>
          {problem.tags.map((tag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Problem Statement */}
        <Text style={styles.sectionTitle}>Problem</Text>
        <RenderHtml
          contentWidth={width - 80}
          source={{ html: problem.statementHtml }}
          tagsStyles={htmlTagStyles}
          baseStyle={baseStyles}
          ignoredDomTags={['center', 'script', 'style', 'math']}
        />

        {/* Input Specification */}
        <Text style={styles.sectionTitle}>Input</Text>
        <RenderHtml
          contentWidth={width - 80}
          source={{ html: problem.inputSpecHtml }}
          tagsStyles={htmlTagStyles}
          baseStyle={baseStyles}
          ignoredDomTags={['center', 'script', 'style', 'math']}
        />

        {/* Output Specification */}
        <Text style={styles.sectionTitle}>Output</Text>
        <RenderHtml
          contentWidth={width - 80}
          source={{ html: problem.outputSpecHtml }}
          tagsStyles={htmlTagStyles}
          baseStyle={baseStyles}
          ignoredDomTags={['center', 'script', 'style', 'math']}
        />

        {/* Test Cases */}
        {problem.samples.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Examples</Text>
            {problem.samples.map((sample, index) => (
              <View key={index} style={styles.testCase}>
                <View style={styles.testCaseSection}>
                  <Text style={styles.testCaseLabel}>Input</Text>
                  <View style={styles.codeBlock}>
                    <Text style={styles.codeText}>{sample.input}</Text>
                  </View>
                </View>
                <View style={styles.testCaseSection}>
                  <Text style={styles.testCaseLabel}>Output</Text>
                  <View style={styles.codeBlock}>
                    <Text style={styles.codeText}>{sample.output}</Text>
                  </View>
                </View>
              </View>
            ))}
          </>
        )}

        {/* Note */}
        {problem.noteHtml && (
          <>
            <Text style={styles.sectionTitle}>Note</Text>
            <RenderHtml
              contentWidth={width - 80}
              source={{ html: problem.noteHtml }}
              tagsStyles={htmlTagStyles}
              baseStyle={baseStyles}
              ignoredDomTags={['center', 'script', 'style', 'math']}
            />
          </>
        )}

        {/* Tutorial/Solution Section */}
        {hasTutorial && (
          <>
            <View style={styles.divider} />
            <TouchableOpacity 
              style={styles.solutionToggle}
              onPress={() => setShowSolution(!showSolution)}
            >
              <Text style={styles.solutionToggleText}>
                {showSolution ? 'Hide Solution' : 'Show Solution'}
              </Text>
              <Text style={styles.solutionToggleArrow}>
                {showSolution ? '^' : 'v'}
              </Text>
            </TouchableOpacity>
            
            {showSolution && (
              <View style={styles.solutionContent}>
                <RenderHtml
                  contentWidth={width - 80}
                  source={{ html: problem.tutorialHtml! }}
                  tagsStyles={htmlTagStyles}
                  baseStyle={baseStyles}
                  ignoredDomTags={['center', 'script', 'style', 'math', 'img']}
                />
              </View>
            )}
          </>
        )}

        {/* Bottom padding */}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Decorative accent */}
      <View style={[styles.topAccent, { backgroundColor: difficultyColor }]} />
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
    alignItems: 'center',
    marginBottom: 16,
  },
  indexBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  indexText: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  headerInfo: {
    flex: 1,
  },
  contestName: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  metaDot: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    letterSpacing: -0.3,
    lineHeight: 28,
  },
  difficultyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  difficultyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  difficultyText: {
    fontSize: 14,
    fontWeight: '600',
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    marginTop: 8,
  },
  testCase: {
    marginBottom: 16,
  },
  testCaseSection: {
    marginBottom: 12,
  },
  testCaseLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  codeBlock: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  codeText: {
    fontFamily: 'Courier',
    fontSize: 13,
    color: '#22D3EE',
    lineHeight: 20,
  },
  solutionToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  solutionToggleText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#818CF8',
    marginRight: 8,
  },
  solutionToggleArrow: {
    fontSize: 14,
    color: '#818CF8',
    fontWeight: '700',
  },
  solutionContent: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(99, 102, 241, 0.2)',
  },
})
