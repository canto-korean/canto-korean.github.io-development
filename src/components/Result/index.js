import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import Spinner from '../Spinner';
import csvtojson from 'csvtojson';


function keywordInRowFilter (keyword) {
    return row => row.some(word => word.includes(keyword));
}

function parseCsv (csv) {
    return csvtojson({noheader: true, output: 'csv'}).fromString(csv);
}

function renderRow (row, search = /$a/) {
  return row.filter(Boolean).map((word, index) => {
    const output = word.split(search).map((segment, index, arr) => {
      if (arr.length - 1 === index) { return segment; }
      return <React.Fragment key={index}>{segment}<div className="result__highlight">{search}</div></React.Fragment>;
    });
    if (index === 0) { return (<code key={index} className="result__word result__word--chinese">{output}</code>); }
    return (<div key={index} className="result__word result__word--korean">{index}. {output}</div>);
});
}

export default function Result (props) {
  const {spreadsheetData} = props;
  const inputRef = useRef();
  const [loading, setLoading] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [placeholderHeight, setPlaceholderHeight] = useState(0);
  const [searchHistory, setSearchHistory] = useState({});
  const [searchResult, setSearchResult] = useState(null);
  const [search, setSearch] = useState("");
  const [now, setNow] = useState(null);
  const [wordOfDay, setWordOfDay] = useState(null);
  const pushSearchHistory = useCallback((key, value) => setSearchHistory(prevSearchHistory => ({...prevSearchHistory, [key]: value})), []);
  const onSearchChange = useCallback(event => { setLoading(true); setShowIntro(false); setSearch(event.target.value); }, []);

  const generalSearch = useCallback(keyword => {
      return spreadsheetData.filter(line => line.includes(keyword));
  }, [spreadsheetData]);

  /**
   * Check if the current keyword exist in search history.
   * @param {string} keyword - The searching keyword which is tried to be found
   * in history.
   * @returns {Array<string>|null}
   */
  const historySearch = useMemo (() => {
    // Check if part of the keyword exists in the `searchHistory` map.
    const searchHistoryWords = Object.keys(searchHistory);

    return keyword => {

      // Try to find the exact same keyword in history
      if (searchHistory.hasOwnProperty(keyword)) { return searchHistory[keyword]; }

      // Check if part of the current keyword exists in history, it still does reducing the searching time.
      const potentialMatchKeyword = searchHistoryWords.find(word => keyword.includes(word));
      if (potentialMatchKeyword) {
        const rows = searchHistory[potentialMatchKeyword];
        const results = rows.filter(row => row.includes(keyword));
        if (results.length > 0) { return results; }
      }

      return null;
    };
  }, [searchHistory]);

  const keywordSearch = useCallback(keyword => {
    const historySearchedRows = historySearch(keyword);
    if (Array.isArray(historySearchedRows)) {
      return historySearchedRows;
    } else {
      const generalSearchRows = generalSearch(keyword);
      return generalSearchRows;
    }
  }, [pushSearchHistory, generalSearch, historySearch]);

  useEffect(() => {

    const timeoutId = window.setTimeout(() => {
      if (search.trim() !== "") {
        const result = keywordSearch(search);
        setLoading(false);
        pushSearchHistory(search, result);
        parseCsv(result.join("\n")).then(setSearchResult);
      } else {
        setSearchResult(null);
      }
    }, 500);

    return () => window.clearTimeout(timeoutId);
  }, [search]);

  useEffect(() => {
    const el = inputRef.current;
    if (el instanceof Element) { setPlaceholderHeight(el.getBoundingClientRect().height); }
  }, []);

  useEffect(() => {
    const now = new Date();
    const todayDiff = Math.floor(((+now) - (now.getTimezoneOffset() * 60 * 1000)) / (1000 * 60 * 60 * 24));
    const line = spreadsheetData[spreadsheetData.length - 1 - (todayDiff % spreadsheetData.length)];
    setNow(now);
    parseCsv(line).then(arr => arr[0]).then(setWordOfDay);
  }, [spreadsheetData]);

  return (
    <div className="result">
      <div className="result__input" ref={inputRef}>
        <div className="container">
          <input value={search} onChange={onSearchChange} placeholder="검색 搜尋" />
        </div>
      </div>
      <div className="container">
        <div className="result__placeholder" style={{height: placeholderHeight}} />
        {!showIntro && !search && (!Array.isArray(searchResult) || searchResult.length === 0) ? <div className="result__guide">輸入搜索字詞，結果會喺呢度顯示。</div> : null}
        {loading && search ? <Spinner>正在搜尋...<br />검색중...</Spinner> : null}
        {
          showIntro && now ? (
            <div className="result__intro">
              <h5>每日單字 오늘의 단어 ({`${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`})</h5>
              {wordOfDay ? renderRow(wordOfDay) : null}
              <hr />
              <p>呢個係一個依照由 이정윤 老師提供嘅字典所做嘅簡單廣東話韓文詞典</p>
              <p>資料來源：<a href="https://bit.ly/3oRQHCe" target="_blank">https://bit.ly/3oRQHCe</a></p>
              <p>如果有咩問題或者想參與更加多廣東話同韓文嘅交流請Facebook登入：<a href="https://www.facebook.com/groups/806902066095149" target="_blank">https://www.facebook.com/groups/806902066095149</a></p>
              <p>如果想支持 이정윤 嘅話可以到以下呢個網址：<a href="https://www.buymeacoffee.com/ncOhltm" target="_blank">https://www.buymeacoffee.com/ncOhltm</a></p>
              <p><small>應用程式製作 by <a href="https://github.com/winghimjns" target="_blank">winghimjns</a></small></p>
            </div>
          ) : null
        }
        {!loading && Array.isArray(searchResult) ? (
          <table className="result__table">
            <tbody>
              {searchResult.slice(0, 100).map((row, index) => {
                return (
                  <tr key={index}><td>
                    {renderRow(row, search)}
                  </td></tr>
                );
              })}
            </tbody>
          </table>
        ) : null}
        {!loading && Array.isArray(searchResult) && searchResult.length === 0 ? <center>沒有相關結果 결과가 없습니다</center> : null}
        {!loading && Array.isArray(searchResult) && searchResult.length > 100 ? <center><code>{`總共有${searchResult.length}相關字詞，顯示首100個結果`}</code><br /><br /></center> : null}
      </div>
    </div>
  );
}
