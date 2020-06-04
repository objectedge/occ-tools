import PropTypes from "prop-types"
import styled from "styled-components"
import { Link } from "gatsby"
import { colors } from "../theme"

const NavigationBtn = styled(Link)`
  font-weight: 500;
  text-transform: uppercase;
  font-size: 0.8rem;
  background-color: ${colors};
  color: #eee;
  padding: 0.7rem 1.5rem;
  border-radius: 5rem;
`

NavigationBtn.propTypes = {
  type: PropTypes.oneOf(["primary"])
}

NavigationBtn.defaultProps = {
  type: "primary"
}

export default NavigationBtn
