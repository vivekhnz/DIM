import React from 'react';
import { reportException } from '../exceptions';
import { t } from 'app/i18next-t';
import './ErrorBoundary.scss';

interface Props {
  name: string;
}

interface State {
  error?: Error;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props) {
    super(props);
    this.state = {};
  }

  componentDidCatch(error: Error, errorInfo) {
    this.setState({ error });
    console.error(error, errorInfo);
    reportException(this.props.name, error, errorInfo);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="dim-error">
          <h2>{t('ErrorBoundary.Title')}</h2>
          <div>{this.state.error.message}</div>
        </div>
      );
    }
    return this.props.children;
  }
}
