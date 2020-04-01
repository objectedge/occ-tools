import React from 'react';

import {
  List,
  Datagrid,
  TextField,
  BooleanField,
  EditButton,
  DeleteButton
} from 'react-admin';
// import Switch from '@material-ui/core/Switch';
// import FormGroup from '@material-ui/core/FormGroup';

import RouteUrlField from '../fields/RouteUrlField';
import RequestsPagination from './RequestsPagination';
import RequestFilter from './RequestFilter';
import RequestBulkActionButtons from './RequestBulkActionButtons';

// const EnabledField = props => (
//   <FormGroup>
//     <Switch checked={true} onChange={() => {}} />
//   </FormGroup>
// );

const RequestList = props => (
<List filters={<RequestFilter />} bulkActionButtons={<RequestBulkActionButtons />} perPage={100} pagination={<RequestsPagination />} {...props}>
      <Datagrid>
          <TextField source="operationId" label="Operation ID" />
          <TextField source="request.method" label="Method" />
          <TextField source="request.statusCode" label="Status Code" />
          <RouteUrlField source="url" label="URL" />
          <BooleanField source="enabled" label="Enabled" />
          {/* <EnabledField label="Enabled" /> */}
          <EditButton />
          <DeleteButton />
      </Datagrid>
  </List>
);

export default RequestList;
