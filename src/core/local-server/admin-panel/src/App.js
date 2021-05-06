import React from 'react';
import { Admin, Resource } from 'react-admin';
import { RequestList, RequestEdit } from './requests';
import Dashboard from './Dashboard';
import simpleRestProvider from 'ra-data-simple-rest';
import StorageIcon from '@material-ui/icons/Storage';

const endpoint = '/local-admin/api';
const isLocalhost = window.location.hostname === 'localhost';
const urlProvider = isLocalhost ? `https://localhost${endpoint}` : endpoint;

const dataProvider = simpleRestProvider(urlProvider);
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
