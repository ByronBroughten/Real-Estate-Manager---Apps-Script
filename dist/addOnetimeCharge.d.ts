export declare class RangeObj {
    private headerIdx;
    private rangeName;
    private rangeValues;
    private headerIndices;
    constructor(rangeName: string, headerIdx: number, declaredHeaders: string[]);
    private initHeaderIndices;
    private get valueRows();
    private get allHeaders();
    get headers(): string[];
    get rangeData(): {
        range: string;
        values: any[][];
    };
    topValue(header: any): any;
    get topValues(): {
        [key: string]: any;
    };
    private setValue;
    setTopValue(header: string, value: any): RangeObj;
    private getValueAtIndices;
    private setValueAtIndices;
    setTopValueRow(headersToValues: HeadersToValues): RangeObj;
    private addEmptyRow;
    addValueRow(headersToValues: HeadersToValues): RangeObj;
    setValueRow(headersToValues: HeadersToValues, valueRowIndex: number): RangeObj;
    indexOfHeader(header: any): number;
    valueColumn(header: string): any[];
    static init({ rangeName, headerIdx, declaredHeaders, }: RangeObjInitProps): RangeObj;
}
type RangeObjInitProps = {
    rangeName: string;
    headerIdx?: number;
    valueIdx?: number;
    declaredHeaders?: string[];
};
type HeadersToValues = {
    [key: string]: any;
};
export declare function handleAddOnetimeCharge(): void;
export {};
//# sourceMappingURL=addOnetimeCharge.d.ts.map