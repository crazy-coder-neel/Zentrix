import React, { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import * as d3 from 'd3'

export default function BehaviorTreeVisuals() {
  const svgRef = useRef(null)

  useEffect(() => {
    if (!svgRef.current) return

    const data = {
      name: "Root (Fallback)",
      type: "selector",
      children: [
        {
          name: "Slip Detected",
          type: "sequence",
          children: [
            { name: "Retry Hint", type: "action" }
          ]
        },
        {
          name: "Mistake Detected",
          type: "sequence",
          children: [
            { name: "Contrast Case", type: "action" },
            { name: "Check Concepts", type: "action" }
          ]
        },
        {
          name: "Misconception Detected",
          type: "sequence",
          children: [
            { name: "Drill Prerequisite", type: "action" },
            { name: "Remediation Path", type: "action" }
          ]
        }
      ]
    }

    const width = 1200
    const height = 500
    const margin = { top: 50, right: 60, bottom: 50, left: 60 }

    const svg = d3.select(svgRef.current)
    svg.selectAll("*").remove()

    const defs = svg.append("defs")
    const filter = defs.append("filter").attr("id", "glowParticle")
    filter.append("feGaussianBlur").attr("stdDeviation", "4").attr("result", "coloredBlur")
    const feMerge = filter.append("feMerge")
    feMerge.append("feMergeNode").attr("in", "coloredBlur")
    feMerge.append("feMergeNode").attr("in", "SourceGraphic")

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`)

    const tree = d3.tree().size([width - margin.left - margin.right, height - margin.top - margin.bottom])
    const root = d3.hierarchy(data)
    tree(root)

    const linkGrp = g.selectAll(".linkGrp")
      .data(root.links())
      .enter().append("g")

    linkGrp.append("path")
      .attr("id", (d, i) => `link-${i}`)
      .attr("d", d3.linkVertical().x(d => d.x).y(d => d.y))
      .attr("fill", "none")
      .attr("stroke", "rgba(255, 143, 111, 0.2)")
      .attr("stroke-width", 2)

    const particle = linkGrp.append("circle")
      .attr("r", 4)
      .attr("fill", "#22c55e")
      .attr("filter", "url(#glowParticle)")

    particle.append("animateMotion")
      .attr("dur", (d, i) => `${2.5 + (i % 3)}s`)
      .attr("repeatCount", "indefinite")
      .attr("calcMode", "linear")
      .append("mpath")
      .attr("href", (d, i) => `#link-${i}`)

    const nodeWidth = 155
    const nodeHeight = 44

    const node = g.selectAll(".node")
      .data(root.descendants())
      .enter().append("g")
      .attr("transform", d => `translate(${d.x},${d.y})`)

    node.append("rect")
      .attr("width", nodeWidth)
      .attr("height", nodeHeight)
      .attr("x", -nodeWidth / 2)
      .attr("y", -nodeHeight / 2)
      .attr("rx", 22)
      .attr("fill", "#1a1a1a")
      .attr("stroke", d => {
        if (d.data.type === "selector") return "#ff8f6f"
        if (d.data.type === "sequence") return "#22c55e"
        return "rgba(255, 255, 255, 0.15)"
      })
      .attr("stroke-width", 1.5)
      .attr("filter", "drop-shadow(0 8px 16px rgba(0,0,0,0.4))")

    node.append("text")
      .attr("dy", 5)
      .attr("text-anchor", "middle")
      .text(d => d.data.name)
      .attr("font-size", "12px")
      .attr("fill", "rgba(255, 255, 255, 0.92)")
      .attr("font-family", "Inter, sans-serif")
      .attr("font-weight", 600)
      .attr("letter-spacing", "0.3px")
      .style("pointer-events", "none")

  }, [])

  return (
    <div className="w-full py-6 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.15, duration: 0.5 }}
        className="w-full overflow-hidden rounded-2xl"
        style={{ height: '420px' }}
      >
        <svg ref={svgRef} viewBox="0 0 1200 500" preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: '100%' }}></svg>
      </motion.div>
    </div>
  )
}
