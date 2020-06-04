import React from "react"
import styled from "styled-components"

const LogoSvg = styled.svg`
  height: 1.8rem;
  margin-right: 1rem;
`

const OeLogo = props => (
  <LogoSvg
    id="Layer_1"
    x="0px"
    y="0px"
    viewBox="0 0 713.9 400"
    xmlSpace="preserve"
    {...props}
  >
    <style>{".st0{fill:#404040}"}</style>
    <path
      className="st0"
      d="M602.1 270.9c-39.2 48.2-110 55.6-158.2 16.4-16.8-13.6-29.3-31.8-36-52.3h48.4v-.1h255.4c2-11.5 3-23.2 3-34.9 0-110.5-89.5-200-200-200s-200 89.5-200 200 89.5 200 200 200c83.1 0 157.5-51.4 187-129.1h-99.6zM514.7 87.5c48.7 0 91.8 31.3 106.9 77.5H407.8c15.1-46.2 58.3-77.5 106.9-77.5z"
    />
    <path
      className="st0"
      d="M202.2 0C91.8 0 2.2 89.5 2.2 200s89.5 200 200 200 200-89.5 200-200S312.7 0 202.2 0zm0 312.5c-62.1 0-112.5-50.4-112.5-112.5S140.1 87.5 202.2 87.5 314.7 137.9 314.7 200s-50.3 112.5-112.5 112.5z"
    />
    <linearGradient
      id="SVGID_1_"
      gradientUnits="userSpaceOnUse"
      x1={158.3413}
      y1={944.8615}
      x2={559.0109}
      y2={814.6716}
      gradientTransform="translate(0 -679.84)"
    >
      <stop offset={0.2} stopColor="#404040" />
      <stop offset={0.5} stopColor="#333" />
      <stop offset={0.8} stopColor="#404040" />
    </linearGradient>
    <path
      d="M514.7 0c-110.5 0-200 89.5-200 200 0 62.1-50.4 112.5-112.5 112.5V400c110.5 0 200-89.5 200-200 0-62.1 50.4-112.5 112.5-112.5h.5V0h-.5z"
      fill="url(#SVGID_1_)"
    />
  </LogoSvg>
)

export default OeLogo
