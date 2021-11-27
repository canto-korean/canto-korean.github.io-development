import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import Spinner from "./components/Spinner";
import csvtojson from 'csvtojson';


const spreadsheetId = '106i6RLyxQYh-jgEnPxZ3TX3C-VT3-k7vY-7gdfoLTyI';
const latestWordCount = 15;

const externalLinkSvg = (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="#00ADB5" d="M5 3c-1.093 0-2 .907-2 2v14c0 1.093.907 2 2 2h14c1.093 0 2-.907 2-2v-7h-2v7H5V5h7V3H5zm9 0v2h3.586l-9.293 9.293 1.414 1.414L19 6.414V10h2V3h-7z" /></svg>);

function runQuery (query) {
    /**
     * Param "tqx=out:csv" is that the data should be responded as CSV format;
     * "range=A2:G" is that the range will exclude the first row (header row)
     * "tq=xxx" is the content of the "Google Visualization API Query Language"
     * @see https://developers.google.com/chart/interactive/docs/querylanguage
     */
    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&range=A2:G&tq=${encodeURIComponent(query)}`;
    return fetch(url)
      .then(response => response.text());
}

function countRows (query) {
    return runQuery("SELECT COUNT(A)")
      .then(str => str.split("\n"))
      .then(lines => lines[lines.length - 1])
      .then(JSON.parse)
      .then(Number);
}

function byRowNum (rowNum) {
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&range=A${rowNum + 1}:G${rowNum + 1}`;
  return fetch(url).then(response => response.text());
}

function byTopRows (num) {
    const firstRow = 2;
    const lastRow = firstRow + num - 1;
    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&range=A${firstRow}:G${lastRow}`;
    return fetch(url).then(response => response.text());
}

function parseCsv (csv) {
    return csvtojson({noheader: true, output: 'csv'}).fromString(csv);
}

function renderRow (row, search = /$a/) {
  return row.filter(Boolean).map((word, index) => {
    const output = word.split(search).map((segment, index, arr) => {
      if (arr.length - 1 === index) { return segment; }
      return <React.Fragment key={index}>{segment}<div className="app__highlight">{search}</div></React.Fragment>;
    });
    if (index === 0) { return (<code key={index} className="app__word app__word--chinese">{output}</code>); }
    return (<div key={index} className="app__word app__word--korean">{index}. {output}</div>);
  });
}

function renderRows (rows, search = /$a/) {
    return rows.map((row, index) => (<tr key={index}><td>{renderRow(row, search)}</td></tr>));
}

function renderSkeleton (rowNum = 1) {
    const skeleton = [...Array(rowNum)].map((nothing, index) => (
      <tr key={index}>
        <td>
          <code className="app__word app__word--chinese app__word--placeholder">...........</code>
          <div className="app__word app__word--korean">1. <span className="app__word-placeholder app__word-placeholder--background-color">..................................................................</span></div>
          <div className="app__word app__word--korean">2. <span className="app__word-placeholder app__word-placeholder--background-color">............................................</span></div>
          <div className="app__word app__word--korean">3. <span className="app__word-placeholder app__word-placeholder--background-color">.....................................................</span></div>
        </td>
      </tr>
    ));
    return (
      <table className="app__table">
        <tbody>
          {skeleton}
        </tbody>
      </table>
    );
}

function App() {
  // ==========
  // Refs
  // ==========
  const inputRef = useRef();
  const textRef = useRef();

  // ==========
  // States
  // ==========
  const [placeholderHeight, setPlaceholderHeight] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [search, setSearch] = useState('');
  const [trimmedSearch, setTrimmedSearch] = useState('');
  const [searchHistory, setSearchHistory] = useState({});
  const [searchResult, setSearchResult] = useState(null);
  const [wordOfDay, setWordOfDay] = useState(null);
  const [latestWords, setLatestWords] = useState(null);
  const [count, setCount] = useState(null);

  // ==========
  // Callbacks
  // ==========
  const setSearchWord = useCallback(value => {
    setLoading(true);
    setShowIntro(false);
    setSearch(value);
    setTrimmedSearch(value.trim());
  }, []);
  const onSearchInputChange = useCallback(event => { setSearchWord(event.target.value); }, [setSearchWord]);
  const onClearButtonClick = useCallback(() => { setSearchWord(""); }, [setSearchWord]);
  const pushSearchHistory = useCallback((key, value) => setSearchHistory(prevSearchHistory => ({...prevSearchHistory, [key]: value})), []);

  // ==========
  // Memos
  // ==========
  const latestWordsNode = useMemo(() => {
      if (!Array.isArray(latestWords)) { return <Spinner />; }
      return latestWords.map(([word], index) => <code className="app__latest-word" key={index} onClick={() => { setSearchWord(word); }}>{word}</code>);
  }, [latestWords, setSearchWord]);

  // ==========
  // Constants
  // ==========
  const now = useMemo(() => new Date(), []);

  useEffect(() => {
    textRef.current.focus();
  }, []);

  /**
   * Fetch the "word count" and "word of day"
   */
  useEffect(() => {
    const todayDiff = Math.floor(((+now) - (now.getTimezoneOffset() * 60 * 1000)) / (1000 * 60 * 60 * 24));

    (async function () {
      const rows = await countRows();
      const wordOfDayRows = await byRowNum(rows - (todayDiff % rows));
      setCount(rows);
      parseCsv(wordOfDayRows).then(arr => arr[0]).then(setWordOfDay);
    })();
  }, [now]);

  /**
   * Latest added words
   */
  useEffect(() => {
    (async function () {
      const topRows = await byTopRows(latestWordCount);
      parseCsv(topRows).then(setLatestWords);
    })();
  }, []);

  useEffect(() => {
    if (!searchHistory.hasOwnProperty(trimmedSearch)) {
      const timeoutId = window.setTimeout(() => {
        if (trimmedSearch !== "") {
          /**
           * A LIKE ... OR B LIKE ... OR C LIKE ...... unfortunately there isn't
           * any shortcut statement for this kind of query, I have to list them
           * all here
           */
          runQuery(`SELECT * WHERE A LIKE '%${trimmedSearch}%' OR B LIKE '%${trimmedSearch}%' OR C LIKE '%${trimmedSearch}%' OR D LIKE '%${trimmedSearch}%' OR E LIKE '%${trimmedSearch}%' OR F LIKE '%${trimmedSearch}%' OR G LIKE '%${trimmedSearch}%'`)
            .then(resultLines => {
              pushSearchHistory(trimmedSearch, resultLines);
              parseCsv(resultLines)
                .then(setSearchResult)
                .then(() => setLoading(false));
          });
        } else {
          setSearchResult(null);
        }
      }, 500);
      return () => window.clearTimeout(timeoutId);
    } else {
      parseCsv(searchHistory[trimmedSearch])
        .then(setSearchResult)
        .then(() => setLoading(false));
    }
  }, [search, trimmedSearch, pushSearchHistory, searchHistory]);

  useEffect(() => {
    const el = inputRef.current;
    if (el instanceof Element) { setPlaceholderHeight(el.getBoundingClientRect().height); }
  }, []);

  return (
    <div className="app">
      <div className="app__input" ref={inputRef}>
        <div className="container">
          <input value={search} onChange={onSearchInputChange} placeholder="검색 搜尋" ref={textRef} />
          <button className="button" disabled={!search} onClick={onClearButtonClick}>清除 해제</button>
        </div>
      </div>
      <div className="container">
        <div className="app__placeholder" style={{height: placeholderHeight}} />
        {!showIntro && !trimmedSearch && (!Array.isArray(searchResult) || searchResult.length === 0) ? <div className="app__guide">輸入搜索字詞，結果會喺呢度顯示。<hr /></div> : null}
        {loading && trimmedSearch ? renderSkeleton(3) : null}
        {!trimmedSearch && (!Array.isArray(searchResult) || searchResult.length === 0) ?
        (
          <>
            <h5>每日詞語 오늘의 단어 ({`${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`})</h5>
            {wordOfDay ? (<table className="app__table"><tbody><tr><td>{renderRow(wordOfDay)}</td></tr></tbody></table>) : renderSkeleton(1)}
            <h5>最近收錄詞語 {latestWordCount} 個 최근의 단어 {latestWordCount}게</h5>
            {latestWordsNode}
            <hr />
          </>
        ) : null}
        {
          showIntro && now ? (
            <div className="app__intro">
              <p>呢個係一個依照由 이정윤 老師提供嘅字典所做嘅簡單廣東話韓文詞典網頁程式，多謝老師每日教我哋韓文。</p>
              <p>現已收錄 {typeof count === "number" ? count : "..."} 個記錄。</p>
              <p>
                <a href="https://docs.google.com/forms/d/1FZkQx42_2uurNOU_CRO3o-EYszGolMBxFjherNJWaj4/viewform" target="_blank" rel="noreferrer">{externalLinkSvg} 到此提交新記錄請求 (Google Form)</a>
              </p>
              <ul className="app__external-links">
                <li>
                  資料來源 <a href="https://bit.ly/3oRQHCe" target="_blank" rel="noreferrer"> {externalLinkSvg} https://bit.ly/3oRQHCe</a>
                </li>
                <li>
                  廣東話同韓文Facebook群組 <a href="https://www.facebook.com/groups/806902066095149" target="_blank" rel="noreferrer"> {externalLinkSvg} https://www.facebook.com/groups/806902066095149</a>
                </li>
                <li>
                  老師 Buy Me a Coffee <a href="https://www.buymeacoffee.com/ncOhltm" target="_blank" rel="noreferrer"> {externalLinkSvg} https://www.buymeacoffee.com/ncOhltm</a>
                </li>
                <li>
                  老師 Patreon <a href="https://www.patreon.com/user?u=34023316" target="_blank" rel="noreferrer"> {externalLinkSvg} https://www.patreon.com/user?u=34023316</a>
                </li>
              </ul>
              <p className="app__author"><small>應用程式製作 by <a href="https://github.com/winghimjns" target="_blank" rel="noreferrer">winghimjns</a></small></p>
            </div>
          ) : null
        }
        {!loading && Array.isArray(searchResult) && searchResult.length > 100 ? <center><code>{`總共有${searchResult.length}相關字詞，顯示首100個結果`}</code><br /><br /></center> : null}
        {!loading && Array.isArray(searchResult) ? (
          <table className="app__table">
            <tbody>
              {renderRows(searchResult.slice(0, 100), trimmedSearch)}
            </tbody>
          </table>
        ) : null}
        {!loading && Array.isArray(searchResult) && searchResult.length === 0 ? <center>沒有相關結果 결과가 없습니다</center> : null}
        {!loading && Array.isArray(searchResult) && searchResult.length > 100 ? <center><code>{`總共有${searchResult.length}相關字詞，顯示首100個結果`}</code><br /><br /></center> : null}
      </div>
    </div>
  );
}

export default App;
