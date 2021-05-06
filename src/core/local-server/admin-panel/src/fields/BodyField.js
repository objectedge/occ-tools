import React from 'react';
import EditJSONField from './EditJSONField';
import { useForm } from 'react-final-form';
import { convertAllToString } from '../helpers';

const BodyField = ({ record }) => {
  const form = useForm()

  return (
    <EditJSONField
      json={record.request.body}
      loaded
      onChange={newData => {
        form.change('request.body', convertAllToString(newData));
      }}
    />
  )
};

export default BodyField;
