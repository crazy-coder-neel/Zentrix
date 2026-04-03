import React, { useRef, useEffect, useState } from 'react'
import * as d3 from 'd3'

import { API } from '../api';


const STATE_COLORS = {
  strong:     '#22c55e',
  developing: '#fdd34d',
  weak:       '#ff716c',
  locked:     '#555555',
}

export default function DashboardDAG() {
  const svgRef = useRef(null)
  const [dagData, setDagData] = useState(null)

  useEffect(() => {
    fetch(`${API}/api/dag?student_id=default`)
      .then(r => r.json())
      .then(data => setDagData(data))
      .catch(err => {
        console.error('Failed to fetch DAG, using fallback:', err)

        setDagData({
          nodes: [
            { id: 'C01', name: 'Signed Numbers', mastery: 0, state: 'weak', tier: 0 },
            { id: 'C03', name: 'Variables', mastery: 0, state: 'weak', tier: 0 },
            { id: 'C07', name: 'One-Step Eq.', mastery: 0, state: 'locked', tier: 2 },
            { id: 'C08', name: 'Two-Step Eq.', mastery: 0, state: 'locked', tier: 2 },
            { id: 'C09', name: 'Vars Both Sides', mastery: 0, state: 'locked', tier: 2 },
            { id: 'C12', name: 'y = mx + b', mastery: 0, state: 'locked', tier: 3 },
          ],
          edges: [
            { from: 'C01', to: 'C07' },
            { from: 'C03', to: 'C07' },
            { from: 'C07', to: 'C08' },
            { from: 'C08', to: 'C09' },
            { from: 'C08', to: 'C12' },
          ],
        })
      })
  }, [])

  useEffect(() => {
    if (!svgRef.current || !dagData) return

    const nodes = dagData.nodes.map(n => ({
      id: n.id,
      name: n.name,
      mastery: n.mastery || 0,
      state: n.state || 'weak',
      tier: n.tier,
    }))

    const nodeById = {}
    nodes.forEach(n => { nodeById[n.id] = n })

    const links = dagData.edges
      .filter(e => nodeById[e.from] && nodeById[e.to])
      .map(e => ({
        source: e.from,
        target: e.to,
      }))

    const width = 500
    const height = 320

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    svg.attr('viewBox', `0 0 ${width} ${height}`)

    const g = svg.append('g')

    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(90))
      .force('charge', d3.forceManyBody().strength(-350))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide(30))

    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', 'rgba(255, 143, 111, 0.3)')
      .attr('stroke-width', 2)

    const node = g.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')

    node.append('circle')
      .attr('r', d => d.tier <= 1 ? 18 : 22)
      .attr('fill', '#1a1a1a')
      .attr('stroke', d => STATE_COLORS[d.state] || '#555')
      .attr('stroke-width', 3)
      .style('cursor', 'grab')
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended))

    node.append('text')
      .attr('dy', 4)
      .attr('text-anchor', 'middle')
      .text(d => Math.round(d.mastery) + '%')
      .attr('font-size', d => d.tier <= 1 ? '9px' : '11px')
      .attr('fill', '#fff')
      .attr('font-weight', 700)
      .attr('font-family', 'Inter, sans-serif')
      .style('pointer-events', 'none')

    node.append('text')
      .attr('dy', d => d.tier <= 1 ? 32 : 36)
      .attr('text-anchor', 'middle')
      .text(d => d.name.length > 18 ? d.name.slice(0, 16) + '…' : d.name)
      .attr('font-size', '10px')
      .attr('fill', '#adaaaa')
      .attr('font-weight', 500)
      .attr('font-family', 'Inter, sans-serif')
      .style('pointer-events', 'none')

    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y)

      node.attr('transform', d => `translate(${
        Math.max(30, Math.min(width - 30, d.x))
      },${
        Math.max(30, Math.min(height - 40, d.y))
      })`)
    })

    function dragstarted(event) {
      if (!event.active) simulation.alphaTarget(0.3).restart()
      event.subject.fx = event.subject.x
      event.subject.fy = event.subject.y
    }
    function dragged(event) {
      event.subject.fx = event.x
      event.subject.fy = event.y
    }
    function dragended(event) {
      if (!event.active) simulation.alphaTarget(0)
      event.subject.fx = null
      event.subject.fy = null
    }

    return () => simulation.stop()
  }, [dagData])

  return (
    <div style={{ width: '100%', height: '320px', position: 'relative' }}>
      <svg ref={svgRef} style={{ width: '100%', height: '100%' }}></svg>
    </div>
  )
}
