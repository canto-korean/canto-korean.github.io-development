import Spinner from '../Spinner';


export default function Loading () {
  return (
    <div className="loading">
      <Spinner>Loading...<br />잠시만...</Spinner>
    </div>
  );
}
