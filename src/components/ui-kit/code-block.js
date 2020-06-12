import React from "react"
import styled from "styled-components"
import PropTypes from "prop-types"
import Highlight, { defaultProps } from "prism-react-renderer"
import highlightTheme from "prism-react-renderer/themes/nightOwl"

const LineNo = styled.span`
  display: table-cell;
  text-align: right;
  padding-right: 1em;
  user-select: none;
  opacity: 0.5;
`

const Pre = styled.pre`
  font-family: "Fira Code", monospace;
  font-size: 0.9rem;
  text-align: left;
  padding: 1.5rem;
  overflow: hidden;
  text-rendering: optmizeLegibility;
  margin-bottom: 1rem;
`

const Line = styled.div`
  display: table-row;
`

const LineContent = styled.span`
  display: table-cell;
`

const CodeBlock = ({ codeBlock, language, showNumbers = false }) => (
  <Highlight
    {...defaultProps}
    theme={highlightTheme}
    code={codeBlock}
    language={language}
  >
    {({ className, style, tokens, getLineProps, getTokenProps }) => (
      <Pre className={className} style={style}>
        {tokens.map((line, i) => (
          <Line key={i} {...getLineProps({ line, key: i })}>
            {showNumbers && <LineNo>{i + 1}</LineNo>}
            <LineContent>
              {line.map((token, key) => (
                <span key={key} {...getTokenProps({ token, key })} />
              ))}
            </LineContent>
          </Line>
        ))}
      </Pre>
    )}
  </Highlight>
)

CodeBlock.propTypes = {
  codeBlock: PropTypes.string.isRequired,
  language: PropTypes.string.isRequired,
  showNumbers: PropTypes.bool,
}

CodeBlock.defaultProps = {
  showNumbers: false,
}

export default CodeBlock
