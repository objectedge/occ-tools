import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { MenuItemLink } from 'react-admin';

import SubMenu from './SubMenu';

const Menu = ({ onMenuClick, dense, logout }) => {
    const [state, setState] = useState({
        menuCatalog: false,
        menuPages: false,
        menuCustomers: false,
    });
    const open = useSelector((state) => state.admin.ui.sidebarOpen);
    useSelector((state) => state.theme); // force rerender on theme change

    const handleToggle = (menu) => {
        setState(state => ({ ...state, [menu]: !state[menu] }));
    };

    return (
        <div>
            {' '}
            <MenuItemLink
                to={`/request`}
                primaryText={'Requests'}
                // leftIcon={<orders.icon />}
                onClick={onMenuClick}
                sidebarIsOpen={open}
                dense={dense}
            />
            <SubMenu
                handleToggle={() => handleToggle('menuDesign')}
                isOpen={state.menuPages}
                sidebarIsOpen={open}
                name="Design"
                // icon={<orders.icon />}
                dense={dense}
            >
                <MenuItemLink
                    to={`/layouts`}
                    primaryText={'Layouts'}
                    // leftIcon={<orders.icon />}
                    onClick={onMenuClick}
                    sidebarIsOpen={open}
                    dense={dense}
                />
            </SubMenu>
        </div>
    );
};

export default Menu;
