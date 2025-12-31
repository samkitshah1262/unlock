// Unlock - Knowledge Graph Exploration with Gestures

import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  PanResponder,
  Modal,
  TouchableOpacity,
} from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import ErrorBoundary from './src/components/ErrorBoundary'
import { CardSkeleton } from './src/components/SkeletonLoader'
import { NoContentEmpty } from './src/components/EmptyState'
import ProblemCard from './src/components/ProblemCard'
import MathCard from './src/components/MathCard'
import AIPrimerCard from './src/components/AIPrimerCard'
import GraphOverlay from './src/components/GraphOverlay'
import { getRandomProblems } from './src/services/problems'
import { fetchMathCards } from './src/services/math'
import { loadAllCards as loadAIPrimers, loadGraph as loadLocalGraph } from './src/services/ai-primers'
import { cacheContent, getCachedContent, cacheJourney } from './src/services/cache'
import { fetchRandomCards, fetchGraph, hasContent as hasSupabaseContent } from './src/services/supabase-content'
import type { ProblemCard as ProblemCardType } from './src/types/codeforces'
import type { MathCard as MathCardType } from './src/types/math'
import type { AIPrimerCard as AIPrimerCardType } from './src/types/ai-primers'
import type { KnowledgeGraph, UserJourney } from './src/types/graph'
import { getDifficultyColor } from './src/types/codeforces'
import { subjectInfo } from './src/types/math'
import { getCategoryInfo } from './src/types/ai-primers'

const { width, height } = Dimensions.get('window')
const SWIPE_THRESHOLD = 80

// Union type for all content
type ContentItem = 
  | { type: 'codeforces'; data: ProblemCardType }
  | { type: 'math'; data: MathCardType }
  | { type: 'ai_primers'; data: AIPrimerCardType }

function AppContent() {
  // Content state
  const [allContent, setAllContent] = useState<ContentItem[]>([])
  const [currentCard, setCurrentCard] = useState<ContentItem | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  // Graph state
  const [aiGraph, setAiGraph] = useState<KnowledgeGraph | null>(null)
  const [showGraph, setShowGraph] = useState(false)
  
  // Journey tracking
  const [journey, setJourney] = useState<UserJourney>({
    explored: new Set<string>(),
    path: [],
    traversedEdges: [],
    byDomain: { math: 0, codeforces: 0, ai_primers: 0 },
    startTime: Date.now(),
  })
  
  // Animation state
  const translateX = useRef(new Animated.Value(0)).current
  const opacity = useRef(new Animated.Value(1)).current
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null)
  
  // Refs for latest values (to avoid stale closures in PanResponder)
  const currentCardRef = useRef<ContentItem | null>(null)
  const allContentRef = useRef<ContentItem[]>([])
  const journeyRef = useRef<UserJourney>(journey)
  const aiGraphRef = useRef<KnowledgeGraph | null>(null)
  const navigateToCardRef = useRef<(card: ContentItem, dir: 'left' | 'right') => void>(() => {})
  
  // Keep refs in sync
  useEffect(() => { currentCardRef.current = currentCard }, [currentCard])
  useEffect(() => { allContentRef.current = allContent }, [allContent])
  useEffect(() => { journeyRef.current = journey }, [journey])
  useEffect(() => { aiGraphRef.current = aiGraph }, [aiGraph])

  // Load all content on mount
  useEffect(() => {
    loadAllContent()
  }, [])

  const loadAllContent = async () => {
    setIsLoading(true)
    try {
      // Try to load from cache first for instant display
      const cached = await getCachedContent()
      
      let problems: any[] = []
      let mathCards: any[] = []
      let aiCards: any[] = []
      let graph: any = null
      
      if (cached) {
        // Use cached content for instant load
        problems = cached.problems || []
        mathCards = cached.mathCards || []
        aiCards = cached.aiCards || []
        graph = cached.graph
      }
      
      // Check if Supabase has content (prefer remote)
      const hasRemote = await hasSupabaseContent()
      
      if (hasRemote) {
        // Fetch from Supabase
        const remoteContent = await fetchRandomCards(200)
        problems = remoteContent.problems
        mathCards = remoteContent.mathCards
        aiCards = remoteContent.aiCards
        graph = await fetchGraph()
        
        // Cache for offline use
        await cacheContent({ problems, mathCards, aiCards, graph })
      } else if (!cached) {
        // Fallback to bundled content if no cache and no Supabase
        const results = await Promise.all([
          Promise.resolve(getRandomProblems(100)),
          fetchMathCards(),
          loadAIPrimers(),
          loadLocalGraph()
        ])
        problems = results[0] || []
        mathCards = results[1] || []
        aiCards = results[2] || []
        graph = results[3]
        
        // Cache for offline use
        await cacheContent({ problems, mathCards, aiCards, graph })
      }
      
      // Convert to unified format (filter out any null/undefined)
      const allItems: ContentItem[] = [
        ...problems.filter((p: any) => p && p.id).map((p: any) => ({ type: 'codeforces' as const, data: p })),
        ...mathCards.filter((m: any) => m && m.id).map((m: any) => ({ type: 'math' as const, data: m })),
        ...aiCards.filter((a: any) => a && a.id).map((a: any) => ({ type: 'ai_primers' as const, data: a }))
      ]
      
      // Shuffle
      const shuffled = allItems.sort(() => Math.random() - 0.5)
      
      setAllContent(shuffled)
      setAiGraph(graph)
      
      // Set initial card
      if (shuffled.length > 0) {
        setCurrentCard(shuffled[0])
        recordCardView(shuffled[0])
      }
    } catch {
      // Try cache as fallback on error
      const cached = await getCachedContent()
      if (cached) {
        const allItems: ContentItem[] = [
          ...(cached.problems || []).filter((p: any) => p && p.id).map((p: any) => ({ type: 'codeforces' as const, data: p })),
          ...(cached.mathCards || []).filter((m: any) => m && m.id).map((m: any) => ({ type: 'math' as const, data: m })),
          ...(cached.aiCards || []).filter((a: any) => a && a.id).map((a: any) => ({ type: 'ai_primers' as const, data: a }))
        ]
        const shuffled = allItems.sort(() => Math.random() - 0.5)
        setAllContent(shuffled)
        setAiGraph(cached.graph)
        if (shuffled.length > 0) {
          setCurrentCard(shuffled[0])
          recordCardView(shuffled[0])
        }
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Record that user viewed a card
  const recordCardView = useCallback((card: ContentItem | null) => {
    if (!card || !card.type) return
    
    const cardId = getCardId(card)
    const domain = card.type
    
    setJourney(prev => {
      const newExplored = new Set(prev.explored)
      newExplored.add(cardId)
      
      return {
        ...prev,
        explored: newExplored,
        path: [...prev.path, cardId],
        byDomain: {
          ...prev.byDomain,
          [domain]: prev.byDomain[domain] + 1
        }
      }
    })
  }, [])

  // Cache journey whenever it changes
  useEffect(() => {
    if (journey.path.length > 0) {
      cacheJourney({
        path: journey.path,
        explored: Array.from(journey.explored),
        traversedEdges: journey.traversedEdges,
        startTime: journey.startTime
      })
    }
  }, [journey])

  // Get card ID
  const getCardId = (card: ContentItem | null): string => {
    try {
      if (!card || !card.type || !card.data) return 'unknown'
      if (card.type === 'codeforces') return `cf-${card.data.id}`
      if (card.type === 'math') return `math-${card.data.id}`
      return `ai-${card.data.id}`
    } catch {
      return 'error'
    }
  }

  // Find related card (for swipe right) - uses refs for fresh values
  const findRelatedCard = (card: ContentItem | null): ContentItem | null => {
    if (!card) return null
    
    const content = allContentRef.current
    const graph = aiGraphRef.current
    const explored = journeyRef.current.explored
    
    // For AI primers, use the graph
    if (card.type === 'ai_primers' && graph) {
      const adj = graph.adjacencyList[card.data.id]
      if (adj) {
        // Prefer unexplored cards
        const candidates = [...(adj.related || []), ...(adj.next || []), ...(adj.siblings || [])]
        const unexplored = candidates.filter(id => !explored.has(`ai-${id}`))
        const targetId = unexplored[0] || candidates[0]
        
        if (targetId) {
          const found = content.find(c => 
            c.type === 'ai_primers' && c.data.id === targetId
          )
          if (found) return found
        }
      }
    }
    
    // Fallback: find a random card of same type
    const sameType = content.filter(c => 
      c.type === card.type && getCardId(c) !== getCardId(card)
    )
    if (sameType.length > 0) {
      // Prefer unexplored
      const unexplored = sameType.filter(c => !explored.has(getCardId(c)))
      if (unexplored.length > 0) {
        return unexplored[Math.floor(Math.random() * unexplored.length)]
      }
      return sameType[Math.floor(Math.random() * sameType.length)]
    }
    
    return null
  }

  // Go back in history (for swipe left) - uses refs for fresh values
  const goBack = (): ContentItem | null => {
    const path = journeyRef.current.path
    const content = allContentRef.current
    
    if (path.length < 2) return null
    
    // Get previous card ID
    const prevId = path[path.length - 2]
    
    // Find the card
    const found = content.find(c => getCardId(c) === prevId)
    return found || null
  }

  // Navigate to a new card with animation
  const navigateToCard = useCallback((newCard: ContentItem, direction: 'left' | 'right') => {
    const prevCard = currentCardRef.current
    setSwipeDirection(direction)
    
    // Animate out
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: direction === 'right' ? -width : width,
        duration: 200,
        useNativeDriver: true
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true
      })
    ]).start(() => {
      // Update card
      setCurrentCard(newCard)
      recordCardView(newCard)
      
      // Record edge traversal for graph
      if (direction === 'right' && prevCard) {
        setJourney(prev => ({
          ...prev,
          traversedEdges: [
            ...prev.traversedEdges,
            { from: getCardId(prevCard), to: getCardId(newCard), timestamp: Date.now() }
          ]
        }))
      }
      
      // Reset position for animate in
      translateX.setValue(direction === 'right' ? width : -width)
      
      // Animate in
      Animated.parallel([
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 8
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true
        })
      ]).start(() => {
        setSwipeDirection(null)
      })
    })
  }, [translateX, opacity, recordCardView])
  
  // Keep navigateToCard ref in sync
  useEffect(() => { navigateToCardRef.current = navigateToCard }, [navigateToCard])

  // Long press timer
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const touchStartTime = useRef<number>(0)
  const hasMoved = useRef<boolean>(false)
  
  // Pan responder for swipe gestures (uses refs for fresh values)
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => {
        touchStartTime.current = Date.now()
        hasMoved.current = false
        
        // Start long press timer
        longPressTimerRef.current = setTimeout(() => {
          if (!hasMoved.current) {
            setShowGraph(true)
          }
        }, 500)
        
        return false // Don't capture yet
      },
      onMoveShouldSetPanResponder: (_, gesture) => {
        // Cancel long press if moving
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current)
          longPressTimerRef.current = null
        }
        hasMoved.current = true
        
        // Only capture HORIZONTAL swipes (let vertical scroll through)
        const isHorizontal = Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5
        const shouldCapture = isHorizontal && Math.abs(gesture.dx) > 15
        return shouldCapture
      },
      onPanResponderGrant: () => {
        // Cancel long press
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current)
          longPressTimerRef.current = null
        }
      },
      onPanResponderMove: (_, gesture) => {
        translateX.setValue(gesture.dx * 0.5)
        opacity.setValue(1 - Math.abs(gesture.dx) / width * 0.3)
      },
      onPanResponderRelease: (_, gesture) => {
        // Cancel long press
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current)
          longPressTimerRef.current = null
        }
        
        const card = currentCardRef.current
        
        if (!card) {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start()
          Animated.timing(opacity, { toValue: 1, duration: 100, useNativeDriver: true }).start()
          return
        }
        
        if (gesture.dx > SWIPE_THRESHOLD) {
          // Swipe RIGHT (finger moves right) - go to RELATED (explore deeper)
          const related = findRelatedCard(card)
          if (related) {
            navigateToCardRef.current(related, 'right')
          } else {
            Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start()
            Animated.timing(opacity, { toValue: 1, duration: 100, useNativeDriver: true }).start()
          }
        } else if (gesture.dx < -SWIPE_THRESHOLD) {
          // Swipe LEFT (finger moves left) - go BACK in history
          const prev = goBack()
          if (prev) {
            setJourney(j => ({ ...j, path: j.path.slice(0, -1) }))
            navigateToCardRef.current(prev, 'left')
          } else {
            Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start()
            Animated.timing(opacity, { toValue: 1, duration: 100, useNativeDriver: true }).start()
          }
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start()
          Animated.timing(opacity, { toValue: 1, duration: 100, useNativeDriver: true }).start()
        }
      },
      onPanResponderTerminate: () => {
        // Cancel long press
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current)
          longPressTimerRef.current = null
        }
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start()
        Animated.timing(opacity, { toValue: 1, duration: 100, useNativeDriver: true }).start()
      }
    })
  ).current
  
  
  // Shuffle to a random card from any domain
  const handleShuffle = useCallback(() => {
    if (allContent.length === 0) return
    
    // Pick a random card
    const randomIndex = Math.floor(Math.random() * allContent.length)
    const randomCard = allContent[randomIndex]
    
    // Navigate to it
    navigateToCard(randomCard, Math.random() > 0.5 ? 'left' : 'right')
  }, [allContent, navigateToCard])

  // Get accent color for current card
  const getAccentColor = (): string => {
    if (!currentCard) return '#808080'
    
    try {
      if (currentCard.type === 'codeforces') {
        return getDifficultyColor(currentCard.data?.rating) || '#10B981'
      } else if (currentCard.type === 'math') {
        return subjectInfo[currentCard.data?.subject]?.color || '#6366F1'
    } else {
        return getCategoryInfo(currentCard.data?.category).color
      }
    } catch {
      return '#808080'
    }
  }

  // Get domain info
  const getDomainInfo = (): { name: string } => {
    if (!currentCard) return { name: 'Loading' }
    
    const domainMap = {
      codeforces: { name: 'Codeforces' },
      math: { name: 'Math' },
      ai_primers: { name: 'AI' }
    }
    return domainMap[currentCard.type]
  }

  // Loading state with skeleton
  if (isLoading) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.appName}>Unlock</Text>
          </View>
        </View>
        <CardSkeleton />
      </View>
    )
  }

  // Empty state - no content loaded
  if (!currentCard || allContent.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.appName}>Unlock</Text>
          </View>
        </View>
        <NoContentEmpty onShuffle={loadAllContent} />
      </View>
    )
  }

  const accentColor = getAccentColor()
  const domainInfo = getDomainInfo()

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.appName}>Unlock</Text>
        </View>
        <TouchableOpacity style={styles.shuffleButton} onPress={handleShuffle}>
          <Text style={styles.shuffleText}>Shuffle</Text>
        </TouchableOpacity>
      </View>

      {/* Domain & Navigation Hints */}
      <View style={styles.navHints}>
        <View style={styles.hintLeft}>
          <Text style={styles.hintArrow}>←</Text>
          <Text style={styles.hintText}>Back</Text>
        </View>
        <View style={[styles.domainBadge, { backgroundColor: accentColor + '30' }]}>
          <Text style={[styles.domainText, { color: accentColor }]}>{domainInfo.name}</Text>
        </View>
        <View style={styles.hintRight}>
          <Text style={styles.hintText}>Explore</Text>
          <Text style={styles.hintArrow}>→</Text>
        </View>
      </View>

      {/* Card Container with Swipe and Long Press */}
      <View style={styles.cardContainer} {...panResponder.panHandlers}>
        <Animated.View
          style={[
            styles.cardAnimated,
            {
              transform: [{ translateX }],
              opacity
            }
          ]}
        >
          <View style={styles.cardWrapper}>
            {currentCard.type === 'codeforces' ? (
              <ProblemCard problem={currentCard.data as ProblemCardType} />
            ) : currentCard.type === 'math' ? (
              <MathCard card={currentCard.data as MathCardType} />
            ) : (
              <AIPrimerCard card={currentCard.data as AIPrimerCardType} />
            )}
          </View>
        </Animated.View>

        {/* Swipe Indicators */}
        {swipeDirection === 'left' && (
          <View style={[styles.swipeIndicator, styles.swipeLeft]}>
            <Text style={styles.swipeIcon}>🔗</Text>
            <Text style={styles.swipeLabel}>Explore</Text>
          </View>
        )}
        {swipeDirection === 'right' && (
          <View style={[styles.swipeIndicator, styles.swipeRight]}>
            <Text style={styles.swipeIcon}>↩️</Text>
            <Text style={styles.swipeLabel}>Back</Text>
          </View>
        )}
      </View>

      {/* Bottom Hint */}
      <View style={styles.bottomHint}>
        <Text style={styles.longPressHint}>Long press to see knowledge map</Text>
      </View>

      {/* Progress Breadcrumb */}
      <View style={styles.breadcrumb}>
        {journey.path.slice(-5).map((id, i) => (
          <View 
            key={id + i} 
            style={[
              styles.breadcrumbDot,
              i === journey.path.slice(-5).length - 1 && { backgroundColor: accentColor }
            ]} 
          />
        ))}
      </View>

      {/* Graph Overlay Modal */}
      <Modal
        visible={showGraph}
        animationType="fade"
        transparent
        onRequestClose={() => setShowGraph(false)}
      >
        <GraphOverlay
          journey={journey}
          currentCardId={getCardId(currentCard)}
          graph={aiGraph}
          allContent={allContent}
          onClose={() => setShowGraph(false)}
          onNavigate={(cardId) => {
            const card = allContent.find(c => getCardId(c) === cardId)
            if (card) {
              setShowGraph(false)
              navigateToCard(card, 'right')
            }
          }}
          accentColor={accentColor}
        />
      </Modal>
    </GestureHandlerRootView>
  )
}

// Wrap with ErrorBoundary for graceful error handling
export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.5)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  appName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  shuffleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  shuffleText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
  },
  navHints: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  hintLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  hintRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  hintArrow: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.3)',
  },
  hintText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
    fontWeight: '500',
  },
  domainBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  domainText: {
    fontSize: 13,
    fontWeight: '600',
  },
  cardContainer: {
    flex: 1,
    position: 'relative',
  },
  cardAnimated: {
    flex: 1,
  },
  cardWrapper: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  swipeIndicator: {
    position: 'absolute',
    top: '40%',
    alignItems: 'center',
    gap: 4,
  },
  swipeRight: {
    right: 20,
  },
  swipeLeft: {
    left: 20,
  },
  swipeIcon: {
    fontSize: 28,
  },
  swipeLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
  },
  bottomHint: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  longPressHint: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.25)',
    fontWeight: '500',
  },
  breadcrumb: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 30,
    gap: 6,
  },
  breadcrumbDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
})
