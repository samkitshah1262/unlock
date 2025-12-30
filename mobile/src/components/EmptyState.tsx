// Empty State - Shows when no content is available

import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native'

interface EmptyStateProps {
  title: string
  message: string
  emoji?: string
  actionLabel?: string
  onAction?: () => void
}

export default function EmptyState({
  title,
  message,
  emoji = '📭',
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      
      {actionLabel && onAction && (
        <TouchableOpacity style={styles.button} onPress={onAction}>
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

// Preset empty states
export function NoContentEmpty({ onShuffle }: { onShuffle: () => void }) {
  return (
    <EmptyState
      emoji="🔍"
      title="No content found"
      message="We couldn't find any learning content. Try shuffling to discover something new!"
      actionLabel="Shuffle"
      onAction={onShuffle}
    />
  )
}

export function NoHistoryEmpty() {
  return (
    <EmptyState
      emoji="🗺️"
      title="Your journey begins here"
      message="Swipe left to explore related topics. Your learning path will appear here."
    />
  )
}

export function NoRelatedEmpty({ onShuffle }: { onShuffle: () => void }) {
  return (
    <EmptyState
      emoji="🎯"
      title="End of the path"
      message="You've explored all connected topics! Try shuffling to discover something new."
      actionLabel="Shuffle"
      onAction={onShuffle}
    />
  )
}

export function OfflineEmpty({ onRetry }: { onRetry: () => void }) {
  return (
    <EmptyState
      emoji="📡"
      title="You're offline"
      message="Check your internet connection and try again."
      actionLabel="Retry"
      onAction={onRetry}
    />
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    maxWidth: 280,
  },
  button: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
})

