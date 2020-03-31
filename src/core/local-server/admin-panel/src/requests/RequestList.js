import React from 'react';

import {
  List,
  Datagrid,
  TextField
} from 'react-admin';

import RouteUrlField from '../fields/RouteUrlField';
import RequestsPagination from './RequestsPagination';
import RequestFilter from './RequestFilter';

const RequestList = props => (
  <List filters={<RequestFilter />} perPage={100} pagination={<RequestsPagination />} {...props}>
      <Datagrid rowClick="edit">
          <TextField source="operationId" />
          <TextField source="request.method" />
          <TextField source="request.statusCode" />
          <RouteUrlField source="url" />
      </Datagrid>
  </List>
);

export default RequestList;
