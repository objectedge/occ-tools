import React from 'react';
import EditJSONField from './EditJSONField';
import {
  useQueryWithStore,
  Loading,
  Error
} from 'react-admin';
import { useForm } from 'react-final-form';

const ResponseField = ({ record }) => {
  const form = useForm()

  const { data, loading, error } = useQueryWithStore({
      type: 'getOne',
      resource: 'ccstore/response',
      payload: { id: record.id }
  });

  if (loading) return <Loading />;
  if (error) return <Error />;
  if (!data) return null;

  return (
    <EditJSONField
      json={data.data}
      loaded
      onChange={newData => {
        form.change('newResponseData', newData);
      }}
    />
  )
};

export default ResponseField;
