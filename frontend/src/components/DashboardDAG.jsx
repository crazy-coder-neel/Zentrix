import React, { useRef, useEffect } from 'react'
import * as d3 from 'd3'

export default function DashboardDAG() {
  const svgRef = useRef(null)

  useEffect(() => {
    if (!svgRef.current) return

    const nodes = [
      { id: "Factorization", name: "Factorization", mastery: 92, type: "core" },
      { id: "QuadraticForms", name: "Quadratic Forms", mastery: 75, type: "core" },
      { id: "Identities", name: "Identities", mastery: 85, type: "prereq" },
      { id: "ModP", name: "Mod p", mastery: 40, type: "prereq" },
      { id: "Functions", name: "Functions", mastery: 68, type: "prereq" },
      { id: "DiffSquares", name: "Diff. of Squares", mastery: 38, type: "prereq" },
    ]

    const links = [
      { source: "Identities", target: "Factorization" },
      { source: "DiffSquares", target: "Factorization" },
      { source: "Factorization", target: "QuadraticForms" },
      { source: "ModP", target: "QuadraticForms" },
      { source: "Functions", target: "QuadraticForms" },
    ]

    const width = 500
    const height = 320

    const svg = d3.select(svgRef.current)
    svg.selectAll("*").remove()
    svg.attr("viewBox", `0 0 ${width} ${height}`)

    const g = svg.append("g")

    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id(d => d.id).distance(90))
      .force("charge", d3.forceManyBody().strength(-350))
      .force("center", d3.forceCenter(width / 2, height / 2))

    // Links
    const link = g.append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", "rgba(255, 143, 111, 0.3)")
      .attr("stroke-width", 2)

    // Nodes
    const node = g.append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")

    node.append("circle")
      .attr("r", d => d.type === 'core' ? 26 : 18)
      .attr("fill", "#1a1a1a")
      .attr("stroke", d => {
        if (d.mastery > 80) return "#22c55e"
        if (d.mastery > 60) return "#fdd34d"
        return "#ff716c"
      })
      .attr("stroke-width", 3)
      .style("cursor", "grab")
      .call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended))

    // Mastery % inside node
    node.append("text")
      .attr("dy", 4)
      .attr("text-anchor", "middle")
      .text(d => d.mastery + '%')
      .attr("font-size", d => d.type === 'core' ? "11px" : "9px")
      .attr("fill", "#fff")
      .attr("font-weight", 700)
      .attr("font-family", "Inter, sans-serif")
      .style("pointer-events", "none")

    // Labels below
    node.append("text")
      .attr("dy", d => d.type === 'core' ? 40 : 32)
      .attr("text-anchor", "middle")
      .text(d => d.name)
      .attr("font-size", "11px")
      .attr("fill", "#adaaaa")
      .attr("font-weight", 500)
      .attr("font-family", "Inter, sans-serif")
      .style("pointer-events", "none")

    simulation.on("tick", () => {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y)

      node.attr("transform", d => `translate(${
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

  }, [])

  return (
    <div style={{ width: '100%', height: '320px', position: 'relative' }}>
      <svg ref={svgRef} style={{ width: '100%', height: '100%' }}></svg>
    </div>
  )
}
