import React from "react"
import styled from "styled-components"
import PropTypes from "prop-types"
import theme from "styled-theming"
import { AiOutlineInfoCircle } from "react-icons/ai"

import { colors } from "../theme"

const alertBoxBackgroundColor = theme.variants("mode", "type", {
  info: { light: "#bae7ff", dark: "#bae7ff" },
})

const AlertBoxContainer = styled.div`
  display: flex;
  align-items: center;
  border: 1px solid ${colors};
  background-color: ${alertBoxBackgroundColor};
  margin-bottom: 1rem;
`
AlertBoxContainer.propTypes = {
  type: PropTypes.oneOf(["info", "success", "warn", "danger"])
}
AlertBoxContainer.defaultProps = {
  type: "info"
}

const IconBox = styled.span`
  display: flex;
  align-items: center;
  background-color: ${colors};
  padding: 0.5rem 0.5rem;
  font-size: 1.8rem;
  color: #ddd;
  margin-right: 1rem;
`
IconBox.propTypes = {
  type: PropTypes.oneOf(["info", "success", "warn", "danger"])
}
IconBox.defaultProps = {
  type: "info"
}

function getIcon(type) {
  switch (type) {
    case "info":
      return <AiOutlineInfoCircle />
    default:
      return null
  }
}

const AlertBox = ({ type = "info", children }) => {

  return <AlertBoxContainer type={type}>
    <IconBox>{getIcon(type)}</IconBox>
    <span>{children}</span>
  </AlertBoxContainer>
}

export default AlertBox

