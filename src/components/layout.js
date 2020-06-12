import React, { useState } from "react"
import PropTypes from "prop-types"
import { useStaticQuery, graphql } from "gatsby"
import styled, { createGlobalStyle, ThemeProvider } from "styled-components"

import SEO from "../components/seo"
import { backgroundColor, foregroundColor, colorPallete } from "./theme"
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

  h1, h2, h3 {
    letter-spacing: 0.3px;
    font-weight: 500;
    margin-top: 0;
    margin-bottom: 1rem;
  }

  h1 {
    font-weight: 1.8rem;

    @media (min-width: 576px) {
      font-size: 2.2rem;
    }

    @media (min-width: 992px) {
      font-size: 2.5rem;
    }
  }

  h2 {
    font-size: 1.5rem;

    @media (min-width: 576px) {
      font-size: 1.8rem;
    }
  }

  p {
    font-size: 1rem;
    margin-top: 0;
    margin-bottom: 1rem;
  }
  
  code {
    font-family: "Fira Code", monospace;
    font-size: 0.9rem;
    color: ${colorPallete.primary};
    background-color: #eee;
    padding: 0 5px;
  }

  a {
    text-decoration: none;
    color: ${foregroundColor};
  }

  li {
    margin-bottom: 1rem;
  }
`
const Main = styled.main`
  padding-top: ${props => (props.sidebarLayout ? "4rem" : "5rem")};
  padding-left: 1rem;
  padding-right: 1rem;
  padding-bottom: 2rem;

  @media (min-width: 768px) {
    padding-left: ${props => (props.sidebarLayout ? "19rem" : "1rem")};
  }
`

const Layout = ({ type, children }) => {
  const data = useStaticQuery(graphql`
    query SiteTitleQuery {
      site {
        siteMetadata {
          title
          sidebarMenu {
            title
            slug
            children {
              title
              slug
            }
          }
        }
      }
    }
  `)
  const sidebarLayout = type === "with-sidebar"
  const [sidebarOpened, setSidebarOpened] = useState(false)

  function onMenuTogglerClick() {
    setSidebarOpened(!sidebarOpened)
  }

  return (
    <ThemeProvider theme={{ mode: "light" }}>
      <SEO />
      <GlobalStyles />
      <Header
        siteTitle={data.site.siteMetadata.title}
        sticky={sidebarLayout}
        slim={sidebarLayout}
        onMenuTogglerClick={onMenuTogglerClick}
      />
      {sidebarLayout && (
        <Sidebar
          opened={sidebarOpened}
          sidebarMenu={data.site.siteMetadata.sidebarMenu}
        />
      )}
      <Main sidebarLayout={sidebarLayout}>{children}</Main>
    </ThemeProvider>
  )
}

Layout.propTypes = {
  children: PropTypes.node.isRequired,
  type: PropTypes.oneOf(["full", "with-sidebar"]),
}

Layout.defaultProps = {
  type: "with-sidebar",
}

export default Layout
