import React from 'react';
import {
  List,
  Datagrid,
  TextField,
  UrlField,
  Filter,
  ReferenceInput,
  ReferenceManyField,
  TextInput,
  SelectInput,
  Pagination,
  Edit,
  TabbedForm,
  FormTab,
  useQueryWithStore,
  Loading,
  Error
} from 'react-admin';
import { makeStyles } from '@material-ui/core/styles';
import EditJSON from './EditJSON';

const useStyles = makeStyles({
  truncate: {
    "word-break": "break-word"
  },
});

const RouteUrlField = props => {
  const classes = useStyles();
  return <UrlField className={classes.truncate} {...props} />;
};

const RequestsPagination = props => <Pagination rowsPerPageOptions={[10, 25, 50, 100]} {...props} />;

const RequestFilter = (props) => (
  <Filter {...props}>
      <TextInput label="Search" source="q" alwaysOn />
      <ReferenceInput label="Request" source="id" reference="request" allowEmpty>
          <SelectInput optionText="url" />
      </ReferenceInput>
  </Filter>
);

export const RequestList = props => (
  <List filters={<RequestFilter />} perPage={100} pagination={<RequestsPagination />} {...props}>
      <Datagrid rowClick="edit">
          <TextField source="operationId" />
          <TextField source="request.method" />
          <TextField source="request.statusCode" />
          <RouteUrlField source="url" />
      </Datagrid>
  </List>
);

const RequestFields = ({ record }) => (
  Object.keys(record.request)
        .filter(requestFieldKey => requestFieldKey !== 'parameters' && requestFieldKey !== 'headers' && requestFieldKey !== 'body')
        .map(requestFieldKey => <TextInput fullWidth source={`request.${requestFieldKey}`} key={`field-${requestFieldKey}`}/>)
);

const HeadersFields = ({ record }) => (
    <EditJSON json={record.request.headers} loaded onChange={data => {
      console.log(data);
    }} />
);

const ParametersFields = ({ record }) => (
    <EditJSON json={record.request.parameters} loaded onChange={data => {
      console.log(data);
    }} />
);

const BodyField = ({ record }) => (
  <EditJSON json={record.request.body} loaded onChange={data => {
    console.log(data);
  }} />
);

const ResponseField = ({ record }) => {
  const { data, loading, error } = useQueryWithStore({
      type: 'getOne',
      resource: 'ccstore/response',
      payload: { id: record.id }
  });

  if (loading) return <Loading />;
  if (error) return <Error />;
  if (!data) return null;

  return (
    <EditJSON
      json={data.data}
      loaded
      onChange={newData => {
        record.newResponseData = newData
      }}
    />
  )
};

export const RequestEdit = (props) => (
  <Edit {...props}>
    <TabbedForm>
        <FormTab label="General">
          <RequestFields />
        </FormTab>
        <FormTab label="Body Payload">
          <BodyField />
        </FormTab>
        <FormTab label="Headers">
          <HeadersFields />
        </FormTab>
        <FormTab label="Parameters">
          <ParametersFields />
        </FormTab>
        <FormTab label="Response">
          <ResponseField />
        </FormTab>
    </TabbedForm>
  </Edit>
);
