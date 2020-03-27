import React from 'react';
import { List, Datagrid, TextField, UrlField, Filter, ReferenceInput, TextInput, SelectInput } from 'react-admin';

const RequestFilter = (props) => (
  <Filter {...props}>
      <TextInput label="Search" source="q" alwaysOn />
      <ReferenceInput label="Request" source="id" reference="request" allowEmpty>
          <SelectInput optionText="url" />
      </ReferenceInput>
  </Filter>
);

export const RequestList = props => (
  <List filters={<RequestFilter />} perPage={100} {...props}>
      <Datagrid rowClick="edit">
          <TextField source="id" />
          <UrlField source="url" />
          <TextField source="request.parameters" />
          <TextField source="response.dataPath" />
      </Datagrid>
  </List>
);
