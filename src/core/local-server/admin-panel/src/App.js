import React from 'react';
import { Admin, Resource } from 'react-admin';
import { RequestList, RequestEdit } from './requests';
import Dashboard from './Dashboard';
import simpleRestProvider from 'ra-data-simple-rest';
import StorageIcon from '@material-ui/icons/Storage';

const dataProvider = simpleRestProvider('https://local.shop-test1.motorolasolutions.com/local/api');
const App = () => (
  <Admin
    title="Admin"
    dataProvider={dataProvider}
    dashboard={Dashboard}
  >
    <Resource name="ccstore/request" options={{ label: 'Requests' }} list={RequestList} edit={RequestEdit} icon={StorageIcon} />
    <Resource name="ccstore/response" />
  </Admin>
);

export default App;
