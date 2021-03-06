using System;
using System.Collections.Generic;
using System.Text;
using Grpc.Core;
using Grpc.Core.Logging;
using System.Threading.Tasks;
using Opc.Ua;
using MicrosoftOpcUa.Client.Utility;
using System.Text.Json;
using System.Security.Cryptography.X509Certificates;
using Google.Protobuf;
using Pluginv2;

namespace plugin_dotnet
{
    class OpcUAQuery
    {
        public string refId { get; set; }
        public Int64 maxDataPoints { get; set; }
        public Int64 intervalMs { get; set; }
        public Int64 datasourceId { get; set; }
        public TimeRange timeRange { get; set; }
        public string nodeId { get; set; }
        public string[] value { get; set; }
        public string readType { get; set; }
        public object aggregate { get; set; }
        public string interval { get; set; }

        public OpcUAQuery() { }

        public OpcUAQuery(DataQuery dataQuery)
        {
            refId = dataQuery.RefId;
            maxDataPoints = dataQuery.MaxDataPoints;
            intervalMs = dataQuery.IntervalMS;
            timeRange = dataQuery.TimeRange;
            byte[] byDecoded = Convert.FromBase64String(dataQuery.Json.ToBase64());
            OpcUAQuery query = JsonSerializer.Deserialize<OpcUAQuery>(byDecoded);
            datasourceId = query.datasourceId;
            nodeId = query.nodeId;
            value = query.value;
            readType = query.readType;
            aggregate = query.aggregate;
            interval = query.interval;
        }

        public OpcUAQuery(string refId, Int64 maxDataPoints, Int64 intervalMs, Int64 datasourceId, string nodeId)
        {
            this.refId = refId;
            this.maxDataPoints = maxDataPoints;
            this.intervalMs = intervalMs;
            this.datasourceId = datasourceId;
            this.nodeId = nodeId;
        }
    }

    class OpcUaJsonData
    {
        public bool tlsAuth { get; set; }
        public bool tlsAuthWithCACert { get; set; }
        public bool tlsSkipVerify { get; set; }

        public OpcUaJsonData(ByteString base64encoded)
        {
            byte[] byDecoded = System.Convert.FromBase64String(base64encoded.ToString());
            OpcUaJsonData jsonData = JsonSerializer.Deserialize<OpcUaJsonData>(byDecoded);
            tlsAuth = jsonData.tlsAuth;
            tlsAuthWithCACert = jsonData.tlsAuthWithCACert;
            tlsSkipVerify = jsonData.tlsSkipVerify;
        }
    }

    public class BrowseResultsEntry
    {
        public string displayName { get; set; }
        public string browseName { get; set; }
        public string nodeId { get; set; }
        public bool isForward { get; set; }
        public uint nodeClass { get; set; }
        public string typeId { get; set; }
        
        public BrowseResultsEntry() { }
        public BrowseResultsEntry(string displayName, string browseName, string nodeId, ExpandedNodeId typeId, bool isForward, uint nodeClass)
        {
            this.displayName = displayName;
            this.browseName = browseName;
            this.nodeId = nodeId;
            this.isForward = isForward;
            this.typeId = typeId.IdType.ToString();
            this.nodeClass = nodeClass;
        }
    }

    class LogMessage
    {
        public string type { get; set; }
        public string message { get; set; }

        public LogMessage(string type, string message)
        {
            this.type = type;
            this.message = message;
        }

        public string ToJson()
        {
            return JsonSerializer.Serialize<LogMessage>(this);
        }
    }
}