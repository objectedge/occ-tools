import React, { useState } from "react"
import styled from "styled-components"
import classNames from "classnames"
import { Link } from "gatsby"
import { AiOutlineRight, AiOutlineDown } from "react-icons/ai"

import { sidebarForegroundColor, menuItemPadding } from "./styles"

const SidebarMenuContainer = styled.ul`
  list-style: none;
  margin: 0;
  padding: 1rem 0;

  &.submenu {
    padding: 0;
  }

  &.collapsed {
    display: none;
  }
`

const SidebarMenuItemContainer = styled.li`
  position: relative;
`

const SidebarLink = ({ className, ...props }) => {
  function resolveClassNames({ isCurrent, isPartiallyCurrent, href }) {
    if (isCurrent || (isPartiallyCurrent && href !== "/docs/")) {
      return { className: `${className} active` }
    } else {
      return { className }
    }
  }

  return (
    <Link to={props.to} getProps={resolveClassNames}>
      {props.children}
    </Link>
  )
}

const SidebarMenuLink = styled(SidebarLink)`
  font-size: 0.9rem;
  color: ${sidebarForegroundColor};
  padding: ${menuItemPadding};
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 100ms cubic-bezier(0.4, 0, 0.2, 1) 0s;
  position: relative;
  user-select: none;

  .submenu li & {
    padding-left: 2rem;
  }

  &:hover,
  &.active {
    background-color: rgba(0, 0, 0, 0.2);
  }
`

const SidebarSubmenuToggle = styled.a`
  position: absolute;
  right: 0;
  top: 0;
  width: 3rem;
  height: calc(2.5rem + 1px);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  color: ${sidebarForegroundColor};
  transition: all 100ms cubic-bezier(0.4, 0, 0.2, 1) 0s;
  cursor: pointer;
  user-select: none;

  &:hover {
    background-color: rgba(0, 0, 0, 0.2);
  }
`

const SidebarMenuItem = ({ item }) => {
  const [submenuOpen, setSubmenuOpen] = useState(
    window.location.pathname.startsWith(item.slug)
  )

  function toggleSubmenu(e) {
    e.preventDefault()
    setSubmenuOpen(!submenuOpen)
  }

  return (
    <SidebarMenuItemContainer
      className={classNames({ "with-children": !!item.children })}
    >
      <SidebarMenuLink to={item.slug}>{item.title}</SidebarMenuLink>
      {item.children && (
        <>
          <SidebarSubmenuToggle onClick={toggleSubmenu}>
            {submenuOpen ? <AiOutlineDown /> : <AiOutlineRight />}
          </SidebarSubmenuToggle>
          {submenuOpen && (
            <SidebarMenu menu={item.children} className="submenu" />
          )}
        </>
      )}
    </SidebarMenuItemContainer>
  )
}

const SidebarMenu = ({ menu, ...rest }) => (
  <SidebarMenuContainer {...rest}>
    {menu.map(menuItem => (
      <SidebarMenuItem item={menuItem} key={menuItem.slug} />
    ))}
  </SidebarMenuContainer>
)

export default SidebarMenu
