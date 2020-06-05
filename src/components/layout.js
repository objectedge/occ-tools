/**
 * Layout component that queries for data
 * with Gatsby's useStaticQuery component
 *
 * See: https://www.gatsbyjs.org/docs/use-static-query/
 */

import React from "react"
import PropTypes from "prop-types"
import WebFont from "webfontloader"
import { useStaticQuery, graphql } from "gatsby"
import styled, { createGlobalStyle, ThemeProvider } from "styled-components"

import { backgroundColor, foregroundColor } from "./theme"
import Header from "./header"
import Sidebar from "./sidebar"

const GlobalStyles = createGlobalStyle`
  html {
    font-size: 100%;
  }

  body {
    margin: 0;
    font-family: Roboto, sans-serif;
    background-color: ${backgroundColor};
    color: ${foregroundColor}
  }

  a {
    text-decoration: none;
    color: ${foregroundColor};
  }
`
const Main = styled.main`

  @media(min-width: 768px) {
    padding-top: ${props => props.sidebarLayout ? "4rem" : "5rem"};
    padding-left: ${props => props.sidebarLayout ? "19rem" : "0"};
    padding-right: ${props => props.sidebarLayout ? "1rem" : "0"};
    padding-bottom: ${props => props.sidebarLayout ? "1rem" : "0"};
  }
`

const Layout = ({ type, children }) => {
  WebFont.load({
    google: {
      families: [
        "Open Sans:300,300italic,400,400italic,600,600italic,700,700italic,800,800italic",
        "Roboto:100,100italic,300,300italic,regular,italic,500,500italic,700,700italic,900,900italic",
      ],
    },
  })
  const data = useStaticQuery(graphql`
    query SiteTitleQuery {
      site {
        siteMetadata {
          title
        }
      }
    }
  `)
  const sidebarLayout = type === 'with-sidebar'

  return (
    <ThemeProvider theme={{ mode: "light" }}>
      <GlobalStyles />
      <Header siteTitle={data.site.siteMetadata.title} sticky={sidebarLayout} slim={sidebarLayout} />
      {sidebarLayout && <Sidebar />}
      <Main sidebarLayout={sidebarLayout}>{children}</Main>
    </ThemeProvider>
  )
}

Layout.propTypes = {
  children: PropTypes.node.isRequired,
  type: PropTypes.oneOf(["full", "with-sidebar"]),
}

Layout.defaultProps = {
  type: "with-sidebar"
}

export default Layout
