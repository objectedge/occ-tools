import PropTypes from "prop-types"
import styled from "styled-components"
import { Link } from "gatsby"
import { colors } from "../theme"

const NavigationBtn = styled(Link)`
  text-transform: uppercase;
  font-size: 0.8rem;
  background-color: transparent;
  color: ${colors};
  border-radius: 5rem;
  font-weight: 400;
  border: 1px solid ${colors};
  transition: all 0.2s ease;
  padding-top: 0.7rem;
  padding-bottom: 0.7rem;
  padding-left: 1.8rem;
  padding-right: 1.8rem;

  &:hover {
    background-color: ${colors};
    color: #eee;
  }
`

NavigationBtn.propTypes = {
  type: PropTypes.oneOf(["primary"]),
}

NavigationBtn.defaultProps = {
  type: "primary",
}

export default NavigationBtn
