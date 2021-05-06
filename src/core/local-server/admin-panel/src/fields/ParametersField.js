import React from 'react';
import EditJSONField from './EditJSONField';
import { useForm } from 'react-final-form';
import { convertAllToString } from '../helpers';

const ParametersField = ({ record }) => {
  const form = useForm()

  return (
    <EditJSONField
      json={record.request.parameters}
      loaded
      onChange={newData => {
        form.change('request.parameters', convertAllToString(newData));
      }}
    />
  )
};

export default ParametersField;
