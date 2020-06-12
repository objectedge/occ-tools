import PropTypes from "prop-types"
import React from "react"
import styled from "styled-components"
import theme from "styled-theming"
import { Link } from "gatsby"
import { FaGithub } from "react-icons/fa"
import { AiOutlineMenu } from "react-icons/ai"

import OeLogo from "./oe-logo"
import { colors } from "./theme"

const headerBackgroundColor = theme("mode", {
  light: "#fff",
  dark: "#eee",
})

const HeaderBar = styled.header`
  display: flex;
  align-items: center;
  height: ${props => (props.slim ? "3rem" : "5rem")};
  width: calc(100% - 2rem);
  padding: 0 1rem;
  border-bottom: 1px solid #e0e0e0;
  position: ${props => (props.sticky ? "fixed" : "absolute")};
  background-color: ${headerBackgroundColor};
`

HeaderBar.propTypes = {
  slim: PropTypes.bool,
  sticky: PropTypes.bool,
}

HeaderBar.defaultProps = {
  slim: true,
  sticky: true,
}

const SiteTitle = styled.span`
  font-size: 1.2rem;
  font-weight: 700;
`

const LogoLink = styled(Link)`
  flex: 1;
  display: flex;
  align-items: center;
`

const HeaderLink = styled(Link)`
  display: none;
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

  &:hover,
  &.active {
    padding-bottom: 0;
    border-bottom: 4px solid ${colors};
  }

  @media (min-width: 768px) {
    display: flex;
  }
`
HeaderLink.propTypes = {
  type: PropTypes.oneOf(["primary", "secondary"]),
  activeClassName: PropTypes.string,
}

HeaderLink.defaultProps = {
  type: "primary",
  activeClassName: "active",
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
  type: PropTypes.oneOf(["primary", "secondary"]),
}

GithubProjectLink.defaultProps = {
  type: "primary",
}

const MenuToggler = styled.a`
  margin-left: 1rem;
  margin-top: 6px;
  font-size: 1.6rem;

  @media (min-width: 768px) {
    display: none;
  }
`

const Header = ({ slim = true, sticky = true, siteTitle, ...props }) => {
  function onMenuTogglerClick(e) {
    e.preventDefault()
    if (props.onMenuTogglerClick) {
      props.onMenuTogglerClick()
    }
  }

  return (
    <HeaderBar slim={slim} sticky={sticky}>
      <LogoLink to="/">
        <OeLogo />
        <SiteTitle>{siteTitle}</SiteTitle>
      </LogoLink>

      <HeaderLink to="/docs/">Documentation</HeaderLink>
      <HeaderLink to="/docs/user-guide/commands-reference/">
        Commands
      </HeaderLink>
      <GithubProjectLink
        href="https://github.com/objectedge/occ-tools"
        rel="noopener"
        title="GitHub"
      >
        <FaGithub />
      </GithubProjectLink>
      {slim && (
        <MenuToggler onClick={onMenuTogglerClick}>
          <AiOutlineMenu />
        </MenuToggler>
      )}
    </HeaderBar>
  )
}

Header.propTypes = {
  siteTitle: PropTypes.string,
}

Header.defaultProps = {
  siteTitle: ``,
}

export default Header
