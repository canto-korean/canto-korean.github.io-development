import React from 'react';
import classNames from "classnames";

export default function Spinner (props) {
    const {absoluteCenter} = props;
    return (
      <div className={classNames("spinner", {"spinner--absolute-center": absoluteCenter})}>
        <div className="spinner__spinner"></div>
        {props.children ? <div className="spinner__text">{props.children}</div> : ''}
      </div>
    );
}
