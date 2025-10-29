import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import useStyles from './breadCrumb-jss';
import { getPageTitle } from '../../config/pageTitles';

const Breadcrumbs = (props) => {
  const { classes, cx } = useStyles();
  const {
    theme,
    separator,
    location
  } = props;

  let parts = location.pathname.split('/');
  const place = parts[parts.length - 1];
  parts = parts.slice(1, parts.length - 1);

  return (
    <section className={cx(theme === 'dark' ? classes.dark : classes.light, classes.breadcrumbs)}>
      <p>
        Você está em:
        <span>
          {
            parts.map((part, partIndex) => {
              const path = ['', ...parts.slice(0, partIndex + 1)].join('/');
              const partTitle = getPageTitle(part);
              return (
                <Fragment key={path}>
                  <Link to={path}>{partTitle}</Link>
                  { separator }
                </Fragment>
              );
            })
          }
          &nbsp;
          {getPageTitle(place)}
        </span>
      </p>
    </section>
  );
};

Breadcrumbs.propTypes = {
  location: PropTypes.object.isRequired,
  theme: PropTypes.string.isRequired,
  separator: PropTypes.string.isRequired,
};

export default Breadcrumbs;
