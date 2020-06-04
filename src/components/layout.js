/**
 * Layout component that queries for data
 * with Gatsby's useStaticQuery component
 *
 * See: https://www.gatsbyjs.org/docs/use-static-query/
 */

import React from "react"
import PropTypes from "prop-types"
import { useStaticQuery, graphql } from "gatsby"
import { createGlobalStyle, ThemeProvider } from "styled-components"
import WebFont from "webfontloader"

import { backgroundColor, foregroundColor } from "./theme"
import Header from "./header"

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

const Layout = ({ children }) => {
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

  return (
    <ThemeProvider theme={{ mode: "light" }}>
      <GlobalStyles />
      <Header siteTitle={data.site.siteMetadata.title} />
      <main>{children}</main>
    </ThemeProvider>
  )
}

Layout.propTypes = {
  children: PropTypes.node.isRequired,
}

export default Layout
