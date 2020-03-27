import React from 'react';
import { Admin, Resource, ListGuesser } from 'react-admin';
import { UserList } from './users';
import simpleRestProvider from 'ra-data-simple-rest';

const dataProvider = simpleRestProvider('https://local.shop-test1.motorolasolutions.com/local/api');
// const dataProvider = jsonServerProvider('https://jsonplaceholder.typicode.com');
// const App = () => <Admin dataProvider={dataProvider} />;
const App = () => (
  <Admin dataProvider={dataProvider}>
    <Resource name="ccstore" list={ListGuesser} />
  </Admin>
);

export default App;
