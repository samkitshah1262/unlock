// Graph Overlay - 2D Obsidian-style Knowledge Map
// Shows local neighborhood (3-hop) of current card

import React, { useMemo, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
} from 'react-native'
import Svg, { Circle, Line, G, Text as SvgText } from 'react-native-svg'
import type { KnowledgeGraph, UserJourney } from '../types/graph'

const { width, height } = Dimensions.get('window')
const GRAPH_WIDTH = width - 40
const GRAPH_HEIGHT = height * 0.5

interface ContentItem {
  type: 'codeforces' | 'math' | 'ai_primers'
  data: any
}

interface Props {
  journey: UserJourney
  currentCardId: string
  graph: KnowledgeGraph | null
  allContent: ContentItem[]
  onClose: () => void
  onNavigate: (cardId: string) => void
  accentColor: string
}

interface GraphNode {
  id: string
  x: number
  y: number
  label: string
  type: 'current' | 'explored' | 'connected' | 'unexplored'
  domain: string
}

interface GraphEdge {
  from: string
  to: string
  traversed: boolean
}

export default function GraphOverlay({
  journey,
  currentCardId,
  graph,
  allContent,
  onClose,
  onNavigate,
  accentColor
}: Props) {
  const [selectedNode, setSelectedNode] = useState<string | null>(null)

  // Convert Set to array for proper dependency tracking
  const exploredArray = Array.from(journey.explored)
  const traversedEdges = journey.traversedEdges
  const edgesCount = traversedEdges.length
  
  // Build local graph (3-hop neighborhood)
  const { nodes, edges } = useMemo(() => {
    const exploredSet = new Set(exploredArray)
    const nodeMap = new Map<string, GraphNode>()
    const edgeList: GraphEdge[] = []
    
    if (!graph) {
      // For non-AI content, show explored nodes only
      const exploredIds = exploredArray.slice(-20) // Last 20
      
      exploredIds.forEach((id, i) => {
        const angle = (i / exploredIds.length) * Math.PI * 2
        const radius = Math.min(GRAPH_WIDTH, GRAPH_HEIGHT) * 0.35
        
        nodeMap.set(id, {
          id,
          x: GRAPH_WIDTH / 2 + Math.cos(angle) * radius,
          y: GRAPH_HEIGHT / 2 + Math.sin(angle) * radius,
          label: id.split('-').slice(1, 3).join(' ').substring(0, 15),
          type: id === currentCardId ? 'current' : 'explored',
          domain: id.startsWith('ai-') ? 'ai' : id.startsWith('math-') ? 'math' : 'code'
        })
      })
      
      // Add edges from journey
      traversedEdges.slice(-30).forEach(e => {
        if (nodeMap.has(e.from) && nodeMap.has(e.to)) {
          edgeList.push({ from: e.from, to: e.to, traversed: true })
        }
      })
      
      return { nodes: Array.from(nodeMap.values()), edges: edgeList }
    }
    
    // For AI primers with graph, build 3-hop neighborhood
    const visited = new Set<string>()
    const toVisit = [currentCardId.replace('ai-', '')]
    let hop = 0
    const maxHops = 3
    const positionsByHop: Map<number, string[]> = new Map()
    
    while (toVisit.length > 0 && hop <= maxHops) {
      const currentBatch = [...toVisit]
      toVisit.length = 0
      positionsByHop.set(hop, [])
      
      currentBatch.forEach(id => {
        if (visited.has(id)) return
        visited.add(id)
        positionsByHop.get(hop)!.push(id)
        
        // Get connected nodes
        const adj = graph.adjacencyList[id]
        if (adj && hop < maxHops) {
          [...adj.next, ...adj.related.slice(0, 3), ...adj.siblings.slice(0, 2)].forEach(connId => {
            if (!visited.has(connId)) {
              toVisit.push(connId)
              edgeList.push({
                from: `ai-${id}`,
                to: `ai-${connId}`,
                traversed: traversedEdges.some(
                  e => (e.from === `ai-${id}` && e.to === `ai-${connId}`) ||
                       (e.from === `ai-${connId}` && e.to === `ai-${id}`)
                )
              })
            }
          })
        }
      })
      hop++
    }
    
    // Position nodes in concentric circles
    positionsByHop.forEach((ids, hopLevel) => {
      ids.forEach((id, i) => {
        const angle = (i / Math.max(ids.length, 1)) * Math.PI * 2 - Math.PI / 2
        const radius = hopLevel === 0 ? 0 : (hopLevel / maxHops) * Math.min(GRAPH_WIDTH, GRAPH_HEIGHT) * 0.4
        
        const fullId = `ai-${id}`
        const node = graph.nodes[id]
        const isExplored = exploredSet.has(fullId)
        
        nodeMap.set(fullId, {
          id: fullId,
          x: GRAPH_WIDTH / 2 + Math.cos(angle) * radius,
          y: GRAPH_HEIGHT / 2 + Math.sin(angle) * radius,
          label: node?.title?.substring(0, 12) || id.substring(0, 12),
          type: fullId === currentCardId ? 'current' : isExplored ? 'explored' : 'connected',
          domain: 'ai'
        })
      })
    })
    
    return { nodes: Array.from(nodeMap.values()), edges: edgeList }
  }, [graph, exploredArray.length, edgesCount, currentCardId])

  // Get domain color
  const getDomainColor = (domain: string): string => {
    const colors: Record<string, string> = {
      ai: '#8B5CF6',
      math: '#6366F1',
      code: '#10B981'
    }
    return colors[domain] || '#808080'
  }

  // Get node color based on type
  const getNodeColor = (node: GraphNode): string => {
    if (node.type === 'current') return accentColor
    if (node.type === 'explored') return getDomainColor(node.domain)
    if (node.type === 'connected') return 'rgba(255,255,255,0.3)'
    return 'rgba(255,255,255,0.1)'
  }

  // Stats
  const stats = {
    explored: journey.explored.size,
    edges: journey.traversedEdges.length,
    time: Math.round((Date.now() - journey.startTime) / 60000),
    domains: Object.entries(journey.byDomain).filter(([_, v]) => v > 0).length
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backdrop} onPress={onClose} />
      
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>🗺️ Knowledge Map</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Bar */}
        <View style={styles.statsBar}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{stats.explored}</Text>
            <Text style={styles.statLabel}>Explored</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{stats.edges}</Text>
            <Text style={styles.statLabel}>Connections</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{stats.time}m</Text>
            <Text style={styles.statLabel}>Time</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{stats.domains}</Text>
            <Text style={styles.statLabel}>Domains</Text>
          </View>
        </View>

        {/* Graph */}
        <View style={styles.graphContainer}>
          <Svg width={GRAPH_WIDTH} height={GRAPH_HEIGHT}>
            {/* Edges */}
            {edges.map((edge, i) => {
              const from = nodes.find(n => n.id === edge.from)
              const to = nodes.find(n => n.id === edge.to)
              if (!from || !to) return null
              
              return (
                <Line
                  key={`edge-${i}`}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke={edge.traversed ? accentColor : 'rgba(255,255,255,0.1)'}
                  strokeWidth={edge.traversed ? 2 : 1}
                />
              )
            })}
            
            {/* Nodes */}
            {nodes.map((node) => (
              <G key={node.id}>
                <Circle
                  cx={node.x}
                  cy={node.y}
                  r={node.type === 'current' ? 20 : node.type === 'explored' ? 14 : 8}
                  fill={getNodeColor(node)}
                  stroke={node.id === selectedNode ? '#fff' : 'transparent'}
                  strokeWidth={2}
                  onPress={() => {
                    setSelectedNode(node.id)
                    if (node.type !== 'current') {
                      onNavigate(node.id)
                    }
                  }}
                />
                {(node.type === 'current' || node.type === 'explored') && (
                  <SvgText
                    x={node.x}
                    y={node.y + (node.type === 'current' ? 35 : 28)}
                    fill="rgba(255,255,255,0.7)"
                    fontSize={9}
                    textAnchor="middle"
                  >
                    {node.label}
                  </SvgText>
                )}
              </G>
            ))}
          </Svg>
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: accentColor }]} />
            <Text style={styles.legendText}>Current</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#8B5CF6' }]} />
            <Text style={styles.legendText}>Explored</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: 'rgba(255,255,255,0.3)' }]} />
            <Text style={styles.legendText}>Connected</Text>
          </View>
        </View>

        {/* Hint */}
        <Text style={styles.hint}>Tap a node to navigate there</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  content: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
  },
  graphContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
  },
  hint: {
    textAlign: 'center',
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
  },
})

