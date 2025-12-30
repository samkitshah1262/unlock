// Skeleton Loader - Placeholder loading animation

import React, { useEffect, useRef } from 'react'
import { View, StyleSheet, Animated, Dimensions } from 'react-native'

const { width } = Dimensions.get('window')

interface SkeletonProps {
  width?: number | string
  height?: number
  borderRadius?: number
  style?: any
}

export function Skeleton({ 
  width: w = '100%', 
  height = 20, 
  borderRadius = 8,
  style 
}: SkeletonProps) {
  const shimmerAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    )
    animation.start()
    return () => animation.stop()
  }, [shimmerAnim])

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  })

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width: w,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  )
}

// Full card skeleton
export function CardSkeleton() {
  return (
    <View style={styles.cardContainer}>
      {/* Header badges */}
      <View style={styles.headerRow}>
        <Skeleton width={100} height={28} borderRadius={14} />
        <Skeleton width={40} height={28} borderRadius={8} />
      </View>

      {/* Breadcrumb */}
      <Skeleton width={150} height={14} style={{ marginTop: 16 }} />

      {/* Title */}
      <Skeleton width="90%" height={28} style={{ marginTop: 12 }} />
      <Skeleton width="60%" height={28} style={{ marginTop: 8 }} />

      {/* Meta row */}
      <View style={styles.metaRow}>
        <Skeleton width={80} height={16} />
        <Skeleton width={60} height={16} />
        <Skeleton width={70} height={16} />
      </View>

      {/* Tags */}
      <View style={styles.tagsRow}>
        <Skeleton width={70} height={28} borderRadius={14} />
        <Skeleton width={90} height={28} borderRadius={14} />
        <Skeleton width={60} height={28} borderRadius={14} />
      </View>

      {/* Divider */}
      <Skeleton width="100%" height={1} style={{ marginVertical: 20 }} />

      {/* Content paragraphs */}
      <Skeleton width="100%" height={16} style={{ marginTop: 8 }} />
      <Skeleton width="95%" height={16} style={{ marginTop: 8 }} />
      <Skeleton width="100%" height={16} style={{ marginTop: 8 }} />
      <Skeleton width="80%" height={16} style={{ marginTop: 8 }} />
      
      <Skeleton width="100%" height={16} style={{ marginTop: 20 }} />
      <Skeleton width="90%" height={16} style={{ marginTop: 8 }} />
      <Skeleton width="100%" height={16} style={{ marginTop: 8 }} />
    </View>
  )
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  cardContainer: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 24,
    padding: 20,
    margin: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  headerRow: {
    flexDirection: 'row',
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 16,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
    flexWrap: 'wrap',
  },
})

