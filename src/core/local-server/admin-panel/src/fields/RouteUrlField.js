import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { UrlField } from 'react-admin';

const useStyles = makeStyles({
  truncate: {
    "word-break": "break-word"
  },
});

const RouteUrlField = props => {
  const classes = useStyles();
  return <UrlField className={classes.truncate} {...props} />;
};

export default RouteUrlField;
