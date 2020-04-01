import React from 'react';
import EditJSONField from './EditJSONField';
import { useForm } from 'react-final-form';
import { convertAllToString } from '../helpers';

const HeadersField = ({ record }) => {
  const form = useForm()

  return (
    <EditJSONField
      json={record.request.headers}
      loaded
      onChange={newData => {
        form.change('request.headers', convertAllToString(newData));
      }}
    />
  )
};

export default HeadersField;
