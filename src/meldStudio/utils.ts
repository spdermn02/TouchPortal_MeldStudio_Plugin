
export const utils = {
    getItemsByType($MS:any, type:string, parent:string|null = null) {
        const items = $MS.meld?.session?.items ?? {};

        let typeItems: Array<any> = [ ];

        for (let key in items) {
			const item = items[key];

			if (item.type != type) continue;
			if (parent && item.parent != parent) continue;

			typeItems.push({
				name: item.name,
				value: key,
                data: item
			});
		}

		return typeItems;
    }
}