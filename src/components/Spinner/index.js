import React from 'react';
import classNames from "classnames";

export default function Spinner (props) {
    const {left} = props;
    return (
      <div className={classNames("spinner", {"spinner--left": left})}>
        <div className="spinner__spinner"></div>
        {props.children ? <div className="spinner__text">{props.children}</div> : ''}
      </div>
    );
}
