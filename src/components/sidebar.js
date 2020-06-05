import React from "react"
import PropTypes from "prop-types"
import styled from "styled-components"
import { StaticQuery, graphql, Link } from "gatsby"
import theme from "styled-theming"
import { colors } from "../components/theme"

const _buildHierarchicalMenuStructure = posts => {
  return []
}

const sidebarBackgroundColor = theme("mode", {
  light: "#343434",
  dark: "#343434",
})

const sidebarForegroundColor = theme("mode", {
  light: "#eee",
  dark: "#eee"
})

const SidebarContainer = styled.div`
  background-color: ${sidebarBackgroundColor};
  width: 18rem;
  height: calc(100vh - 3rem);
  margin-top: calc(3rem + 1px);
  position: fixed;
  top: 0;
`

const SidebarNavigation = styled.nav``

const SidebarMenu = styled.ul`
  list-style: none;
  margin: 0;
  padding: 1rem 0;
`

const SidebarMenuItem = styled.li`
  &.with-children {
    text-transform: uppercase;
    font-size: 0.8rem;
    font-weight: 500;
  }
`

const SidebarMenuLink = styled(Link)`
  color: ${sidebarForegroundColor};
  padding: 0.75rem 1rem 0.75rem 1.5rem;
  display: block;
  transition: all 100ms cubic-bezier(0.4, 0, 0.2, 1) 0s;
  position: relative;

  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }

  &:hover:before, &.active:before {
    transform: scale(1);
  }

  &:hover:before {
    background-color: #eee;
  }

  &.active:before {
    background-color: ${colors};
  }

  &:before {
    transform: scale(0.1);
    border-radius: 100%;
    content: "";
    left: calc(0.5rem);
    top: 1.1em;
    height: 8px;
    position: absolute;
    width: 8px;
    transition: all 250ms cubic-bezier(0.4, 0, 0.2, 1) 0s;
  }
`
SidebarMenuLink.propTypes = {
  type: PropTypes.oneOf["primary"],
}

SidebarMenuLink.defaultProps = {
  type: "primary",
}

const Sidebar = () => (
  <StaticQuery query={graphql`
    query sidebarQuery {
      allMdx {
        edges {
          node {
            id
            excerpt
            frontmatter {
              title
            }
            fields {
              slug
            }
          }
        }
      }
    }
    `}
    render={
      data => {
        const finalPosts = _buildHierarchicalMenuStructure(data.allMdx.edges)
        const posts = data.allMdx.edges.filter(e => e.node.fields.slug !== '/docs/')

        console.log(finalPosts)

        return (
          <SidebarContainer>
            <SidebarNavigation>
              <SidebarMenu>
                {posts.map(({ node: post }) => (
                  <SidebarMenuItem key={post.id}>
                    <SidebarMenuLink to={post.fields.slug} activeClassName="active">{post.frontmatter.title}</SidebarMenuLink>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarNavigation>
          </SidebarContainer>
        )
      }
    }
  />
)

export default Sidebar
