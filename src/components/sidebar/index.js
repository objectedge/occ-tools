import React from "react"
import styled from "styled-components"
import classNames from "classnames"

import SidebarMenu from "./sidebar-menu"
import { sidebarBackgroundColor } from "./styles"

const SidebarTitle = styled.h2`
  padding-top: 1rem;
  padding-left: 1rem;
  color: #aaa;
  margin: 0;
  font-size: 0.8rem;
  text-transform: uppercase;
  font-weight: 400;
`

const SidebarContainer = styled.div`
  background-color: ${sidebarBackgroundColor};
  width: 18rem;
  height: calc(100vh - 3rem);
  margin-top: calc(3rem + 1px);
  position: fixed;
  top: 0;
  display: none;

  &.opened {
    display: block;
  }

  @media (min-width: 768px) {
    display: block;
  }
`

const SidebarNavigation = styled.nav``

const Sidebar = ({ sidebarMenu = [], opened }) => (
  <SidebarContainer className={classNames({ opened })}>
    <SidebarNavigation>
      <SidebarTitle>Documentation</SidebarTitle>
      <SidebarMenu menu={sidebarMenu} className="menu" />
    </SidebarNavigation>
  </SidebarContainer>
)

export default Sidebar
