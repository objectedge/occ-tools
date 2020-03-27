import React from 'react';
import { Admin, Resource } from 'react-admin';
import { RequestList } from './requests';
import simpleRestProvider from 'ra-data-simple-rest';

const dataProvider = simpleRestProvider('https://local.shop-test1.motorolasolutions.com/local/api');
// const dataProvider = jsonServerProvider('https://jsonplaceholder.typicode.com');
// const App = () => <Admin dataProvider={dataProvider} />;
const App = () => (
  <Admin dataProvider={dataProvider}>
    <Resource name="ccstore/request" options={{ label: 'Requests' }} list={RequestList} />
  </Admin>
);

export default App;
