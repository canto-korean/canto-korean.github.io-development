import './App.scss';
import {useEffect, useState} from 'react';
import Loading from "./components/Loading";
import Result from "./components/Result";
import csvtojson from 'csvtojson';


function App() {
  const [spreadsheetData, setSpreadsheetData] = useState(null);

  useEffect(() => {
    fetch('https://docs.google.com/spreadsheets/d/106i6RLyxQYh-jgEnPxZ3TX3C-VT3-k7vY-7gdfoLTyI/export?format=csv')
      .then(response => response.text())
      .then(csv => csvtojson({noheader: true, output: 'csv'}).fromString(csv))
      .then(arr => arr.slice(1))
      .then(data => data.map(row => row.filter(Boolean)))
      .then(setSpreadsheetData);
  }, []);

  return (
    <div className="app">
        {Array.isArray(spreadsheetData) ? <Result spreadsheetData={spreadsheetData} /> : <Loading />}
    </div>
  );
}

export default App;
