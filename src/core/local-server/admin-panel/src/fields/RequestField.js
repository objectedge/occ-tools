import React from 'react';
import { TextInput } from 'react-admin';

const RequestField = ({ record }) => (
  Object.keys(record.request)
        .filter(requestFieldKey => requestFieldKey !== 'parameters' && requestFieldKey !== 'headers' && requestFieldKey !== 'body')
        .map(requestFieldKey => <TextInput fullWidth source={`request.${requestFieldKey}`} key={`field-${requestFieldKey}`}/>)
);

export default RequestField;
