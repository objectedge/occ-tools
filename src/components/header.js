import OeLogo from "./oe-logo"
import PropTypes from "prop-types"
import React from "react"
import styled from "styled-components"
import { Link } from "gatsby"
import { FaGithub } from "react-icons/fa"

import { colors } from './theme'

const HeaderBar = styled.header`
  display: flex;
  align-items: center;
  height: 5rem;
  padding: 0 1rem;
  border-bottom: 1px solid #e0e0e0;
`

const SiteTitle = styled.span`
  font-size: 1.2rem;
  font-weight: 700;
  flex: 1;
`

const HeaderLink = styled(Link)`
  display: flex;
  align-items: center;
  font-weight: 500;
  text-transform: uppercase;
  font-size: 0.8rem;
  letter-spacing: 1px;
  margin-left: 1rem;
  padding-left: 0.5rem;
  padding-right: 0.5rem;
  padding-bottom: 4px;
  height: calc(100% - 4px);

  &:hover {
    padding-bottom: 0;
    border-bottom: 4px solid ${colors};
  }
`
HeaderLink.propTypes = {
  type: PropTypes.oneOf(["primary", "secondary"])
}

HeaderLink.defaultProps = {
  type: "primary"
}

const GithubProjectLink = styled.a`
  margin-top: 6px;
  margin-left: 1rem;
  font-size: 1.6rem;

  &:hover {
    color: ${colors};
  }
`

GithubProjectLink.propTypes = {
  type: PropTypes.oneOf(["primary", "secondary"])
}

GithubProjectLink.defaultProps = {
  type: "primary"
}


const Header = ({ siteTitle }) => (
  <HeaderBar>
    <OeLogo />
    <SiteTitle>{siteTitle}</SiteTitle>

    <HeaderLink to="/docs">Documentation</HeaderLink>
    <HeaderLink to="/docs/api">API</HeaderLink>
    <GithubProjectLink href="https://github.com/objectedge/occ-tools" rel="noopener" title="GitHub">
      <FaGithub />
    </GithubProjectLink>
  </HeaderBar>
)

Header.propTypes = {
  siteTitle: PropTypes.string,
}

Header.defaultProps = {
  siteTitle: ``,
}

export default Header
